import { SCHEDULES } from '../config/constants';
import { weekDays, weekdayOf } from './weeks';
import { isOnShift } from './attendance';

/**
 * Expands weekly assignments into per-day history entries, newest date first.
 * Only dates up to and including `untilKey` are produced (history never shows the future).
 *
 * @param {{ weekId: string, assignments: object[] }[]} weeks
 * @returns {{ date: string, entries: object[] }[]}
 */
export function expandHistory(weeks, untilKey) {
  const byDate = new Map();
  weeks.forEach(({ weekId, assignments }) => {
    weekDays(weekId).forEach((date) => {
      if (untilKey && date > untilKey) return;
      const wd = weekdayOf(date);
      assignments.forEach((a) => {
        if (!isOnShift(a, wd)) return;
        const list = byDate.get(date) || [];
        list.push({
          id: `${date}_${a.id}`,
          date,
          studentId: a.studentId,
          studentName: a.studentName,
          areaName: a.areaName,
          scheduleType: a.scheduleType,
        });
        byDate.set(date, list);
      });
    });
  });
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, entries]) => ({
      date,
      entries: entries.sort((x, y) => x.studentName.localeCompare(y.studentName)),
    }));
}

export function describeEntry(entry) {
  const s = SCHEDULES[entry.scheduleType];
  return `${entry.areaName} • ${s ? s.shortLabel : entry.scheduleType} (${s ? s.timeLabel : ''})`;
}

/** Case-insensitive substring match on student name or area. Empty query matches everything. */
export function matchesQuery(entry, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  return (
    (entry.studentName || '').toLowerCase().includes(q) || (entry.areaName || '').toLowerCase().includes(q)
  );
}

export function filterHistory(days, query) {
  const q = (query || '').trim();
  if (!q) return days;
  return days
    .map((d) => ({ ...d, entries: d.entries.filter((e) => matchesQuery(e, q)) }))
    .filter((d) => d.entries.length > 0);
}

/**
 * Flattens date groups into rows for a virtualised list. Expanded dates contribute one card row
 * per entry after their header row.
 */
export function flattenRows(days, expanded) {
  const rows = [];
  days.forEach((d) => {
    const open = expanded.has(d.date);
    rows.push({ type: 'header', date: d.date, count: d.entries.length, open });
    if (open) d.entries.forEach((e) => rows.push({ type: 'card', entry: e }));
  });
  return rows;
}
