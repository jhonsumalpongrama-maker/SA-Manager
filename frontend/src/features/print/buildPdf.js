import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildPrintRows, scheduleHeading } from './rows';
import { formatWeekOf } from '../../utils/format';

/** Loads an image URL as a data URL for embedding; resolves null on any failure (CORS, 404, timeout). */
export function loadImageDataUrl(url, timeoutMs = 4000) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function drawLogo(doc, logo, x, boxSize = 22, y = 10) {
  if (!logo) return;
  const ratio = Math.min(boxSize / logo.w, boxSize / logo.h);
  const w = logo.w * ratio;
  const h = logo.h * ratio;
  doc.addImage(logo.dataUrl, 'PNG', x + (boxSize - w) / 2, y + (boxSize - h) / 2, w, h);
}

/**
 * Builds the A4 "CLEANING ASSIGNMENTS" PDF for one schedule.
 * Layout: school logo (left) / organisation logo (right), title, "Week of <date>", then a table with
 * a coloured schedule header row followed by AREA / LOCATION and ASSIGNED STUDENTS.
 */
export async function buildAssignmentsPdf({ scheduleType, weekId, areas, assignments, schoolLogoUrl, orgLogoUrl }) {
  const [school, org] = await Promise.all([loadImageDataUrl(schoolLogoUrl), loadImageDataUrl(orgLogoUrl)]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();

  drawLogo(doc, school, 14);
  drawLogo(doc, org, pageW - 14 - 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CLEANING ASSIGNMENTS', pageW / 2, 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text(formatWeekOf(weekId), pageW / 2, 30, { align: 'center' });
  doc.setTextColor(0);

  const body = buildPrintRows({ areas, assignments, scheduleType });

  autoTable(doc, {
    startY: 40,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    head: [
      [{ content: scheduleHeading(scheduleType), colSpan: 2, styles: { halign: 'center', fillColor: [46, 125, 50], textColor: 255, fontSize: 12 } }],
      ['AREA / LOCATION', 'ASSIGNED STUDENTS'],
    ],
    body: body.length ? body : [['No areas configured', '—']],
    styles: { font: 'helvetica', fontSize: 11, cellPadding: 3, valign: 'middle', lineColor: [200, 200, 200] },
    headStyles: { fillColor: [232, 245, 233], textColor: [27, 94, 32], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
    alternateRowStyles: { fillColor: [248, 250, 248] },
  });

  return doc;
}

/**
 * Opens the PDF in the browser's native viewer, ready for print / Save as PDF.
 * `win` must be a window opened synchronously inside the user's click (window.open('', '_blank'))
 * *before* any async work, otherwise pop-up blockers refuse it. If `win` is null (blocked) the
 * file is downloaded instead.
 */
export function openForPrint(doc, fileName, win) {
  doc.autoPrint();
  const url = doc.output('bloburl');
  if (win) {
    win.location.href = url;
    return 'opened';
  }
  doc.save(fileName);
  return 'downloaded';
}
