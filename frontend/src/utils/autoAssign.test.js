import { describe, it, expect } from 'vitest';
import { pickArea } from './autoAssign';

const areas = [
  { id: 'a', name: 'A', active: true },
  { id: 'b', name: 'B', active: true },
  { id: 'c', name: 'C', active: true },
];

describe('pickArea', () => {
  it('returns null when there are no active areas', () => {
    expect(pickArea({ areas: [], assignments: [] })).toBeNull();
    expect(pickArea({ areas: [{ id: 'x', active: false }], assignments: [] })).toBeNull();
  });

  it('only picks among the least loaded areas', () => {
    const assignments = [{ areaId: 'a' }, { areaId: 'a' }, { areaId: 'b' }];
    for (let i = 0; i < 20; i += 1) {
      expect(pickArea({ areas, assignments, rng: Math.random }).id).toBe('c');
    }
  });

  it('chooses randomly between ties', () => {
    const seen = new Set();
    for (let i = 0; i < 60; i += 1) seen.add(pickArea({ areas, assignments: [] }).id);
    expect(seen.size).toBe(3);
  });

  it('keeps filling evenly when students outnumber areas', () => {
    const assignments = [];
    for (let i = 0; i < 7; i += 1) {
      const a = pickArea({ areas, assignments });
      assignments.push({ areaId: a.id });
    }
    const counts = areas.map((a) => assignments.filter((x) => x.areaId === a.id).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('ignores inactive areas', () => {
    const list = [...areas, { id: 'd', name: 'D', active: false }];
    for (let i = 0; i < 30; i += 1) expect(pickArea({ areas: list, assignments: [] }).id).not.toBe('d');
  });
});
