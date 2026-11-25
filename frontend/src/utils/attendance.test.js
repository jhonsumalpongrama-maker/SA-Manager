import { describe, it, expect } from 'vitest';
import { attendanceRates, buildRoster, shiftFor, summarize } from './attendance';
import { expandHistory, filterHistory, flattenRows } from './history';
import { buildSections } from './grouping';

const A = (id, name, area, scheduleType) => ({
  id,
  studentId: id,
  studentName: name,
  areaName: area,
  areaId: area,
  scheduleType,
});

const week = [
  A('s1', 'Ann', 'Library', 'MWF'),
  A('s2', 'Bob', 'Main Bldg - 1st Floor', 'EVERYDAY'),
  A('s3', 'Cy', 'Wednesday', 'MONTHLY'),
  A('s4', 'Di', 'Friday', 'MONTHLY'),
];

describe('shiftFor', () => {
  it('Monday: MWF + Everyday only', () => {
    expect(shiftFor('2026-11-23', week).map((s) => s.studentName)).toEqual(['Ann', 'Bob']);
  });
  it('Wednesday: adds the Wednesday cleaner', () => {
    expect(shiftFor('2026-11-25', week).map((s) => s.studentName)).toEqual(['Ann', 'Bob', 'Cy']);
  });
  it('Tuesday: no MWF student', () => {
    expect(shiftFor('2026-11-24', week).map((s) => s.studentName)).toEqual(['Bob']);
  });
  it('Sunday: everyday only', () => {
    expect(shiftFor('2026-11-22', week).map((s) => s.studentName)).toEqual(['Bob']);
  });
  it('lists a student once even when assigned to two schedules', () => {
    const dup = [...week, A('s1', 'Ann', 'Main Bldg - 2nd Floor', 'EVERYDAY')];
    const names = shiftFor('2026-11-23', dup).map((s) => s.studentName);
    expect(names.filter((n) => n === 'Ann')).toHaveLength(1);
  });
  it('returns an empty shift for an empty week', () => {
    expect(shiftFor('2026-11-25', [])).toEqual([]);
  });
});

describe('roster + summary', () => {
  it('flags marked-but-unassigned students and counts statuses', () => {
    const shift = shiftFor('2026-11-23', week);
    const records = [
      { studentId: 's1', studentName: 'Ann', status: 'P' },
      { studentId: 'ghost', studentName: 'Gus', areaName: '—', scheduleType: 'MWF', status: 'L' },
    ];
    const rows = buildRoster(shift, records);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.studentId === 'ghost').unscheduled).toBe(true);
    expect(summarize(rows)).toEqual({ P: 1, L: 1, A: 0, unmarked: 1, total: 3 });
  });
});

describe('attendanceRates', () => {
  it('counts present+late as attended and ignores unmarked', () => {
    const rates = attendanceRates([
      { studentId: 's1', studentName: 'Ann', status: 'P' },
      { studentId: 's1', studentName: 'Ann', status: 'L' },
      { studentId: 's1', studentName: 'Ann', status: 'A' },
      { studentId: 's1', studentName: 'Ann', status: null },
      { studentId: 's2', studentName: 'Bob', status: 'A' },
    ]);
    expect(rates[0]).toMatchObject({ studentId: 's1', days: 3 });
    expect(rates[0].rate).toBeCloseTo(2 / 3);
    expect(rates[1].rate).toBe(0);
  });
});

describe('history', () => {
  const weeks = [{ weekId: '2026-11-22', assignments: week }];
  it('expands weekly assignments to days, newest first, never past today', () => {
    const days = expandHistory(weeks, '2026-11-25');
    expect(days.map((d) => d.date)).toEqual(['2026-11-25', '2026-11-24', '2026-11-23', '2026-11-22']);
    expect(days[0].entries.map((e) => e.studentName)).toEqual(['Ann', 'Bob', 'Cy']);
  });
  it('filters across dates by name or area', () => {
    const days = expandHistory(weeks, '2026-11-28');
    const byName = filterHistory(days, 'cy');
    expect(byName).toHaveLength(1);
    expect(byName[0].date).toBe('2026-11-25');
    const byArea = filterHistory(days, 'library');
    expect(byArea.map((d) => d.date)).toEqual(['2026-11-27', '2026-11-25', '2026-11-23']);
  });
  it('flattens only expanded dates into card rows', () => {
    const days = expandHistory(weeks, '2026-11-25');
    const rows = flattenRows(days, new Set(['2026-11-24']));
    expect(rows.filter((r) => r.type === 'header')).toHaveLength(4);
    expect(rows.filter((r) => r.type === 'card')).toHaveLength(1);
  });
});

describe('buildSections', () => {
  const areas = [
    { id: 'Library', name: 'Library', scheduleType: 'MWF', order: 0, active: true },
    { id: 'CISO', name: 'CISO', scheduleType: 'MWF', order: 1, active: true },
    { id: 'Wednesday', name: 'Wednesday', scheduleType: 'MONTHLY', order: 2, active: true },
  ];
  it('keeps every area row when there is no query', () => {
    const s = buildSections({ areas, assignments: week });
    expect(s[0].rows).toHaveLength(2);
    expect(s[0].autoExpand).toBe(false);
  });
  it('shows only matching rows and auto-expands when searching', () => {
    const s = buildSections({ areas, assignments: week, query: 'ann' });
    expect(s[0].rows).toHaveLength(1);
    expect(s[0].autoExpand).toBe(true);
    expect(s[1].rows).toHaveLength(0);
    expect(s[2].autoExpand).toBe(false);
  });
  it('a matching area name keeps all of its students', () => {
    const s = buildSections({ areas, assignments: week, query: 'libr' });
    expect(s[0].rows[0].students).toHaveLength(1);
  });
});
