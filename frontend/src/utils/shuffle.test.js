import { describe, it, expect } from 'vitest';
import { countRepeats, fisherYates, shuffleAssignments } from './shuffle';

// Small deterministic PRNG (mulberry32) so tests are repeatable.
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mk = (prefix, n) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }));

describe('fisherYates', () => {
  it('returns a permutation and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = fisherYates(input, seeded(1));
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('shuffleAssignments', () => {
  it('returns an empty map for an empty schedule or no areas', () => {
    expect(shuffleAssignments({ students: [], areas: mk('a', 3) })).toEqual({});
    expect(shuffleAssignments({ students: mk('s', 3), areas: [] })).toEqual({});
  });

  it('assigns every student and spreads evenly when students outnumber areas', () => {
    const students = mk('s', 11);
    const areas = mk('a', 4);
    const result = shuffleAssignments({ students, areas, rng: seeded(7) });
    expect(Object.keys(result)).toHaveLength(11);
    const counts = areas.map((a) => Object.values(result).filter((x) => x === a.id).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.reduce((x, y) => x + y, 0)).toBe(11);
  });

  it('puts at most one student per area when students are fewer than areas', () => {
    const students = mk('s', 3);
    const areas = mk('a', 8);
    const result = shuffleAssignments({ students, areas, rng: seeded(3) });
    const used = Object.values(result);
    expect(new Set(used).size).toBe(3);
  });

  it('avoids repeating last week\'s area whenever a repeat-free layout exists', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const students = mk('s', 8);
      const areas = mk('a', 8);
      const previous = Object.fromEntries(students.map((s, i) => [s.id, areas[i].id]));
      const result = shuffleAssignments({ students, areas, previousAreaByStudent: previous, rng: seeded(seed) });
      expect(countRepeats(result, previous)).toBe(0);
    }
  });

  it('never creates more repeats than a plain shuffle would when avoidance is impossible', () => {
    const students = mk('s', 4);
    const areas = mk('a', 1); // only one area: every student must repeat
    const previous = Object.fromEntries(students.map((s) => [s.id, 'a0']));
    const result = shuffleAssignments({ students, areas, previousAreaByStudent: previous });
    expect(Object.values(result)).toEqual(['a0', 'a0', 'a0', 'a0']);
  });
});
