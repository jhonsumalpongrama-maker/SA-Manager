import { describe, it, expect } from 'vitest';
import { planDuplicate } from './duplicate';

const areas = [
  { id: 'm1', name: 'Library', scheduleType: 'MWF', active: true },
  { id: 'm2', name: 'CISO', scheduleType: 'MWF', active: true },
  { id: 'e1', name: 'Main Bldg - 1st Floor', scheduleType: 'EVERYDAY', active: true },
];

const prev = [
  { id: 'p1', studentId: 's1', studentName: 'Ann', areaId: 'm1', areaName: 'Library', scheduleType: 'MWF' },
  { id: 'p2', studentId: 's2', studentName: 'Bob', areaId: 'e1', areaName: 'Main Bldg - 1st Floor', scheduleType: 'EVERYDAY' },
];

describe('planDuplicate', () => {
  it('creates everything when the current week is empty', () => {
    const plan = planDuplicate({ previous: prev, current: [], areas, mode: 'merge' });
    expect(plan.toCreate).toHaveLength(2);
    expect(plan.toDeleteIds).toEqual([]);
  });

  it('merge skips students already assigned in the same schedule', () => {
    const current = [{ id: 'c1', studentId: 's1', studentName: 'Ann', areaId: 'm2', areaName: 'CISO', scheduleType: 'MWF' }];
    const plan = planDuplicate({ previous: prev, current, areas, mode: 'merge' });
    expect(plan.toCreate.map((c) => c.studentId)).toEqual(['s2']);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.toDeleteIds).toEqual([]);
  });

  it('replace deletes current assignments and copies all previous ones', () => {
    const current = [{ id: 'c1', studentId: 's1', studentName: 'Ann', areaId: 'm2', areaName: 'CISO', scheduleType: 'MWF' }];
    const plan = planDuplicate({ previous: prev, current, areas, mode: 'replace' });
    expect(plan.toDeleteIds).toEqual(['c1']);
    expect(plan.toCreate).toHaveLength(2);
  });

  it('moves students from a deleted area to a live area of the same schedule', () => {
    const gone = [{ id: 'p9', studentId: 's9', studentName: 'Zed', areaId: 'old', areaName: 'Old', scheduleType: 'MWF' }];
    const plan = planDuplicate({ previous: gone, current: [], areas, mode: 'merge' });
    expect(plan.toCreate).toHaveLength(1);
    expect(['m1', 'm2']).toContain(plan.toCreate[0].areaId);
  });

  it('skips students whose schedule has no active area', () => {
    const plan = planDuplicate({
      previous: [{ id: 'p', studentId: 's', studentName: 'Q', areaId: 'x', areaName: 'X', scheduleType: 'MONTHLY' }],
      current: [],
      areas,
    });
    expect(plan.toCreate).toEqual([]);
    expect(plan.skipped[0].reason).toBe('no-area');
  });

  it('allows the same student in two different schedules', () => {
    const current = [{ id: 'c1', studentId: 's1', studentName: 'Ann', areaId: 'e1', areaName: 'Main', scheduleType: 'EVERYDAY' }];
    const plan = planDuplicate({ previous: [prev[0]], current, areas, mode: 'merge' });
    expect(plan.toCreate).toHaveLength(1);
  });
});
