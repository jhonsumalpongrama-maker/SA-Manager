/**
 * Picks the area for a newly added student: a random choice among the active areas of the
 * schedule that currently hold the fewest students ("least loaded").
 * Returns null when the schedule has no active areas.
 */
export function pickArea({ areas, assignments, rng = Math.random }) {
  const active = areas.filter((a) => a.active !== false);
  if (!active.length) return null;

  const load = new Map(active.map((a) => [a.id, 0]));
  assignments.forEach((as) => {
    if (load.has(as.areaId)) load.set(as.areaId, load.get(as.areaId) + 1);
  });

  const min = Math.min(...load.values());
  const candidates = active.filter((a) => load.get(a.id) === min);
  return candidates[Math.floor(rng() * candidates.length)];
}
