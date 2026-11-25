import { describe, it, expect } from 'vitest';
import {
  addDays,
  dateKeyInTz,
  isValidDateKey,
  monthGrid,
  nextWeekId,
  previousWeekId,
  shiftMonth,
  weekDays,
  weekIdFor,
  weekdayOf,
} from './weeks';

describe('weeks', () => {
  it('validates date keys', () => {
    expect(isValidDateKey('2026-11-25')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('nope')).toBe(false);
  });

  it('finds the week start for Sunday-first weeks', () => {
    // 2026-11-25 is a Wednesday
    expect(weekdayOf('2026-11-25')).toBe(3);
    expect(weekIdFor('2026-11-25', 0)).toBe('2026-11-22');
    expect(weekIdFor('2026-11-22', 0)).toBe('2026-11-22'); // a Sunday is its own week start
    expect(weekIdFor('2026-11-28', 0)).toBe('2026-11-22'); // Saturday
  });

  it('supports Monday-first weeks', () => {
    expect(weekIdFor('2026-11-25', 1)).toBe('2026-11-23');
    expect(weekIdFor('2026-11-22', 1)).toBe('2026-11-16'); // Sunday belongs to the previous week
  });

  it('handles month and year boundaries', () => {
    expect(weekIdFor('2026-12-01', 0)).toBe('2026-11-29');
    expect(weekIdFor('2027-01-01', 0)).toBe('2026-12-27');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
  });

  it('computes previous / next week and the seven days', () => {
    expect(previousWeekId('2026-11-22')).toBe('2026-11-15');
    expect(nextWeekId('2026-11-29')).toBe('2026-12-06');
    expect(weekDays('2026-11-29')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
    ]);
  });

  it('uses the configured timezone to decide which day an instant falls on', () => {
    const instant = new Date('2026-11-24T17:30:00Z'); // 01:30 on the 25th in Manila
    expect(dateKeyInTz(instant, 'Asia/Manila')).toBe('2026-11-25');
    expect(dateKeyInTz(instant, 'UTC')).toBe('2026-11-24');
    expect(dateKeyInTz(instant, 'America/Los_Angeles')).toBe('2026-11-24');
  });

  it('builds a full month grid', () => {
    const grid = monthGrid(2026, 10, 0); // November 2026
    expect(grid[0][0].key).toBe('2026-11-01'); // Nov 1, 2026 is a Sunday
    expect(grid.every((w) => w.length === 7)).toBe(true);
    const inMonth = grid.flat().filter((d) => d.inMonth).length;
    expect(inMonth).toBe(30);
  });

  it('shifts months across years', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 });
  });
});
