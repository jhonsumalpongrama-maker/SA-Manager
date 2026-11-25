import { SCHEDULES, SCHEDULE_ORDER, WEEKDAY_NAMES } from '../config/constants';
import { weekdayOf } from './weeks';

/** Does an assignment fall on this weekday number? */
export function isOnShift(assignment, weekday) {
  const schedule = SCHEDULES[assignment.scheduleType];
  if (!schedule || !schedule.weekdays.includes(weekday)) return false;
  if (assignment.scheduleType === 'MONTHLY') {
    // Monthly cleaners are assigned to one weekday, named by their area ("Wednesday").
    return (assignment.areaName || '').trim().toLowerCase() === WEEKDAY_NAMES[weekday].toLowerCase();
  }
  return true;
}

/**
 * The students scheduled to work on `dateKey`, derived from that week's assignments.
 * Attendance records are keyed by student, so a student assigned to two schedules appears once
 * (the first schedule in MWF > Everyday > Monthly order wins).
 */
export function shiftFor(dateKey, assignments) {
  const weekday = weekdayOf(dateKey);
  const rank = (a) => SCHEDULE_ORDER.indexOf(a.scheduleType);
  const onShift = assignments
    .filter((a) => isOnShift(a, weekday))
    .sort((a, b) => rank(a) - rank(b) || (a.studentName || '').localeCompare(b.studentName || ''));
  const seen = new Set();
  const out = [];
  onShift.forEach((a) => {
    if (seen.has(a.studentId)) return;
    seen.add(a.studentId);
    out.push({
      studentId: a.studentId,
      studentName: a.studentName,
      areaName: a.areaName,
      scheduleType: a.scheduleType,
    });
  });
  return out;
}

/**
 * Merges the shift list with saved records. Students that have a record but are not on the shift
 * (e.g. removed from the week later, or marked although unassigned) are included and flagged
 * `unscheduled`.
 */
export function buildRoster(shift, records) {
  const recById = new Map(records.map((r) => [r.studentId || r.id, r]));
  const rows = shift.map((s) => ({ ...s, unscheduled: false, record: recById.get(s.studentId) || null }));
  const inShift = new Set(shift.map((s) => s.studentId));
  records.forEach((r) => {
    const id = r.studentId || r.id;
    if (inShift.has(id)) return;
    rows.push({
      studentId: id,
      studentName: r.studentName,
      areaName: r.areaName || '—',
      scheduleType: r.scheduleType,
      unscheduled: true,
      record: r,
    });
  });
  return rows;
}

export function summarize(rows) {
  const out = { P: 0, L: 0, A: 0, unmarked: 0, total: rows.length };
  rows.forEach((r) => {
    const s = r.record && r.record.status;
    if (s === 'P' || s === 'L' || s === 'A') out[s] += 1;
    else out.unmarked += 1;
  });
  return out;
}

/**
 * Attendance rate per student over many days.
 * rate = (present + late) / marked days. Unmarked days are not counted against anyone.
 * @param {{ studentId: string, studentName: string, status: 'P'|'L'|'A' }[]} records
 */
export function attendanceRates(records) {
  const map = new Map();
  records.forEach((r) => {
    if (!['P', 'L', 'A'].includes(r.status)) return;
    const row = map.get(r.studentId) || { studentId: r.studentId, studentName: r.studentName, P: 0, L: 0, A: 0 };
    row[r.status] += 1;
    row.studentName = r.studentName || row.studentName;
    map.set(r.studentId, row);
  });
  return [...map.values()]
    .map((row) => {
      const days = row.P + row.L + row.A;
      return { ...row, days, rate: days ? (row.P + row.L) / days : 0 };
    })
    .sort((a, b) => b.rate - a.rate || a.studentName.localeCompare(b.studentName));
}
