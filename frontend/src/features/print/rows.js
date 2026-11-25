import { SCHEDULES } from '../../config/constants';

export const PRINT_SECTIONS = [
  { value: 'MWF', label: 'MWF' },
  { value: 'EVERYDAY', label: 'Everyday' },
  { value: 'MONTHLY', label: 'Cleaners' },
];

/**
 * Table body for one schedule: one row per active area (in configured order); empty areas show "—".
 * Students are listed alphabetically.
 */
export function buildPrintRows({ areas, assignments, scheduleType }) {
  return areas
    .filter((a) => a.scheduleType === scheduleType && a.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
    .map((area) => {
      const names = assignments
        .filter((as) => as.areaId === area.id)
        .map((as) => as.studentName)
        .sort((x, y) => x.localeCompare(y));
      return [area.name, names.length ? names.join(', ') : '—'];
    });
}

export function scheduleHeading(scheduleType) {
  const s = SCHEDULES[scheduleType];
  return `${s.label} (${s.timeLabel})`;
}
