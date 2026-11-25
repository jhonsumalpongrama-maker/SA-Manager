import { pickArea } from './autoAssign';

/**
 * Plans how to copy last week's assignments into the current week.
 *
 * mode "replace": delete every current assignment and create copies of all previous ones.
 * mode "merge":   keep the current assignments and only add previous ones for students that are not
 *                 already assigned in the same schedule.
 *
 * Previous assignments whose area no longer exists / is inactive are moved to the least-loaded
 * active area of the same schedule (or skipped when the schedule has no active area).
 *
 * @returns {{ toCreate: object[], toDeleteIds: string[], skipped: object[] }}
 */
export function planDuplicate({ previous, current, areas, mode = 'merge', rng = Math.random }) {
  const toDeleteIds = mode === 'replace' ? current.map((a) => a.id) : [];
  const baseline = mode === 'replace' ? [] : current.slice();
  const taken = new Set(baseline.map((a) => `${a.scheduleType}|${a.studentId}`));
  const areaById = new Map(areas.map((a) => [a.id, a]));

  const working = baseline.slice(); // used to compute load for re-homed students
  const toCreate = [];
  const skipped = [];

  previous.forEach((p) => {
    const key = `${p.scheduleType}|${p.studentId}`;
    if (taken.has(key)) {
      skipped.push({ ...p, reason: 'already-assigned' });
      return;
    }
    let area = areaById.get(p.areaId);
    if (!area || area.active === false) {
      area = pickArea({
        areas: areas.filter((a) => a.scheduleType === p.scheduleType),
        assignments: working.filter((w) => w.scheduleType === p.scheduleType),
        rng,
      });
    }
    if (!area) {
      skipped.push({ ...p, reason: 'no-area' });
      return;
    }
    const copy = {
      studentId: p.studentId,
      studentName: p.studentName,
      areaId: area.id,
      areaName: area.name,
      scheduleType: p.scheduleType,
    };
    taken.add(key);
    working.push(copy);
    toCreate.push(copy);
  });

  return { toCreate, toDeleteIds, skipped };
}
