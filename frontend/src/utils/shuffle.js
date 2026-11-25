/** Pure randomisation helpers. Every function accepts an `rng` so tests can be deterministic. */

export function fisherYates(items, rng = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Re-distributes students over areas.
 *
 *  - Even spread: every area gets floor(n/m) students and `n % m` random areas get one extra.
 *    With fewer students than areas, only `n` random areas are used (one student each).
 *    With an empty student list or an empty area list the result is an empty map.
 *  - Constraint pass: where possible a student does not land on the area they had last week.
 *    The pass only ever swaps two students when the swap fixes at least one repeat and creates no
 *    new one, so it can never make the result worse.
 *
 * @param {{ students: {id: string}[], areas: {id: string}[], previousAreaByStudent?: Record<string,string>, rng?: () => number }} args
 * @returns {Record<string, string>} studentId -> areaId
 */
export function shuffleAssignments({ students, areas, previousAreaByStudent = {}, rng = Math.random }) {
  if (!students.length || !areas.length) return {};

  const n = students.length;
  const m = areas.length;
  const base = Math.floor(n / m);
  const extra = n % m;

  const shuffledAreas = fisherYates(areas, rng);
  const slots = [];
  shuffledAreas.forEach((area, idx) => {
    const capacity = base + (idx < extra ? 1 : 0);
    for (let c = 0; c < capacity; c += 1) slots.push(area.id);
  });

  const order = fisherYates(students, rng);
  // result[i] is the area slot given to order[i]
  const result = order.map((_, i) => slots[i]);
  const prev = (student) => previousAreaByStudent[student.id];

  for (let pass = 0; pass < 5; pass += 1) {
    let changed = false;
    for (let i = 0; i < order.length; i += 1) {
      if (result[i] !== prev(order[i])) continue;
      for (let j = 0; j < order.length; j += 1) {
        if (i === j) continue;
        const iOk = result[j] !== prev(order[i]);
        const jOk = result[i] !== prev(order[j]);
        if (iOk && jOk) {
          [result[i], result[j]] = [result[j], result[i]];
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }

  const out = {};
  order.forEach((student, i) => {
    out[student.id] = result[i];
  });
  return out;
}

export function countRepeats(assignmentMap, previousAreaByStudent) {
  return Object.entries(assignmentMap).filter(([id, areaId]) => previousAreaByStudent[id] === areaId).length;
}
