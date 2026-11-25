import { describe, it, expect } from 'vitest';
import { buildPrintRows, scheduleHeading } from './rows';

const areas = [
  { id: 'b', name: 'CISO', scheduleType: 'MWF', order: 1, active: true },
  { id: 'a', name: 'Library', scheduleType: 'MWF', order: 0, active: true },
  { id: 'h', name: 'Hidden', scheduleType: 'MWF', order: 2, active: false },
  { id: 'e', name: 'Main Bldg - 1st Floor', scheduleType: 'EVERYDAY', order: 3, active: true },
];

describe('buildPrintRows', () => {
  it('lists active areas of one schedule in order, with an em dash for empty areas', () => {
    const rows = buildPrintRows({
      areas,
      scheduleType: 'MWF',
      assignments: [
        { areaId: 'a', studentName: 'Bob' },
        { areaId: 'a', studentName: 'Ann' },
      ],
    });
    expect(rows).toEqual([
      ['Library', 'Ann, Bob'],
      ['CISO', '—'],
    ]);
  });

  it('builds the coloured header text from schedule name and time', () => {
    expect(scheduleHeading('EVERYDAY')).toBe('Everyday Schedule (7:00 PM onward)');
    expect(scheduleHeading('MWF')).toBe('MWF Schedule (3:00-4:00 PM)');
  });
});
