import { SCHEDULE_ORDER } from '../config/constants';

/**
 * Builds the three accordion sections from areas + assignments and applies the live search.
 * When `query` is non-empty only matching rows are kept (an area row matches if its name matches,
 * in which case all its students stay; otherwise only the students whose name matches), and the
 * section is flagged `autoExpand`.
 */
export function buildSections({ areas, assignments, query = '' }) {
  const q = query.trim().toLowerCase();
  return SCHEDULE_ORDER.map((scheduleType) => {
    const sectionAreas = areas
      .filter((a) => a.scheduleType === scheduleType && a.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

    const rows = sectionAreas
      .map((area) => {
        const students = assignments
          .filter((as) => as.areaId === area.id)
          .sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
        if (!q) return { area, students };
        const areaMatches = area.name.toLowerCase().includes(q);
        const matching = areaMatches ? students : students.filter((s) => (s.studentName || '').toLowerCase().includes(q));
        if (!areaMatches && matching.length === 0) return null;
        return { area, students: matching };
      })
      .filter(Boolean);

    return {
      scheduleType,
      rows,
      total: rows.reduce((n, r) => n + r.students.length, 0),
      autoExpand: Boolean(q) && rows.length > 0,
    };
  });
}

/** Assignments whose area was deleted/deactivated, shown so students are never silently hidden. */
export function findOrphans({ areas, assignments }) {
  const active = new Set(areas.filter((a) => a.active !== false).map((a) => a.id));
  return assignments.filter((a) => !active.has(a.areaId));
}
