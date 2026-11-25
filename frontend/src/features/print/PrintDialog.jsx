import { useState } from 'react';
import Modal from '../../components/Modal';
import { useAppStore } from '../../store/useAppStore';
import { useWeekContext } from '../../hooks/useWeekContext';
import { fetchWeek } from '../../services/assignmentsRepo';
import { PRINT_SECTIONS } from './rows';
import { buildAssignmentsPdf, openForPrint } from './buildPdf';

/** "Print Section" dialog: choose MWF / Everyday / Cleaners, then open the PDF to print or save. */
export default function PrintDialog({ onClose }) {
  const { weekId, settings } = useWeekContext();
  const areas = useAppStore((s) => s.areas);
  const toast = useAppStore((s) => s.toast);
  const [busy, setBusy] = useState(false);

  const print = async (scheduleType) => {
    if (busy) return;
    setBusy(true);
    // Open the window now, while the click still counts as a user gesture; it is filled in later.
    const win = window.open('', '_blank');
    try {
      const assignments = await fetchWeek(weekId);
      const doc = await buildAssignmentsPdf({
        scheduleType,
        weekId,
        areas,
        assignments,
        schoolLogoUrl: settings.schoolLogoUrl,
        orgLogoUrl: settings.orgLogoUrl,
      });
      const result = openForPrint(doc, `cleaning-assignments-${scheduleType.toLowerCase()}-${weekId}.pdf`, win);
      if (result === 'downloaded') toast('Pop-up blocked, so the PDF was downloaded instead.');
      onClose();
    } catch (err) {
      if (win) win.close();
      toast(`Could not create the PDF${err && err.message ? `: ${err.message}` : ''}`, { type: 'error' });
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Print Section"
      footer={
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
      }
    >
      <p className="mb-3">Which section would you like to print for this week?</p>
      <div className="flex flex-col gap-2">
        {PRINT_SECTIONS.map((s, i) => (
          <button key={s.value} type="button" className="btn-ghost justify-start" disabled={busy} onClick={() => print(s.value)} data-autofocus={i === 0 ? true : undefined}>
            {s.label}
          </button>
        ))}
      </div>
      {busy && <p className="mt-3 text-xs text-white/60">Preparing PDF…</p>}
    </Modal>
  );
}
