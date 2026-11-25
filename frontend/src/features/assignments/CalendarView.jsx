import { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons';
import { monthGrid, shiftMonth, weekIdFor, weekDays } from '../../utils/weeks';
import { formatMonthYear } from '../../utils/format';

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' }));
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Inline month calendar: month dropdown, prev/next arrows, today highlighted, the selected week
 * tinted. Selecting a date reports its key; the caller decides which week that loads.
 */
export default function CalendarView({ selected, today, weekStartsOn = 0, onSelect }) {
  const initial = selected || today;
  const [view, setView] = useState({ year: Number(initial.slice(0, 4)), monthIndex: Number(initial.slice(5, 7)) - 1 });
  const grid = useMemo(() => monthGrid(view.year, view.monthIndex, weekStartsOn), [view, weekStartsOn]);
  const selectedWeek = useMemo(() => new Set(weekDays(weekIdFor(selected || today, weekStartsOn))), [selected, today, weekStartsOn]);
  const header = [...DOW.slice(weekStartsOn), ...DOW.slice(0, weekStartsOn)];
  const years = Array.from({ length: 11 }, (_, i) => view.year - 5 + i);

  const move = (delta) => setView((v) => shiftMonth(v.year, v.monthIndex, delta));

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className="icon-btn" onClick={() => move(-1)} aria-label="Previous month">
          <ChevronLeftIcon />
        </button>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="cal-month">
            Month
          </label>
          <select
            id="cal-month"
            className="input !min-h-[40px] w-auto"
            value={view.monthIndex}
            onChange={(e) => setView((v) => ({ ...v, monthIndex: Number(e.target.value) }))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i} className="bg-[#0c2815]">
                {m}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="cal-year">
            Year
          </label>
          <select
            id="cal-year"
            className="input !min-h-[40px] w-auto"
            value={view.year}
            onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#0c2815]">
                {y}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="icon-btn" onClick={() => move(1)} aria-label="Next month">
          <ChevronRightIcon />
        </button>
      </div>

      <table className="w-full table-fixed text-center" aria-label={formatMonthYear(view.year, view.monthIndex)}>
        <thead>
          <tr>
            {header.map((d) => (
              <th key={d} scope="col" className="pb-2 text-xs font-medium text-white/60">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((week) => (
            <tr key={week[0].key}>
              {week.map(({ key, inMonth }) => {
                const isToday = key === today;
                const isSelected = key === (selected || today);
                const inWeek = selectedWeek.has(key);
                return (
                  <td key={key} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => onSelect(key)}
                      aria-label={key}
                      aria-pressed={isSelected}
                      aria-current={isToday ? 'date' : undefined}
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                        isSelected
                          ? 'bg-brand-500 font-semibold text-black'
                          : isToday
                            ? 'border border-brand-300 font-semibold text-brand-300'
                            : inWeek
                              ? 'bg-white/10'
                              : 'hover:bg-white/10'
                      } ${inMonth ? '' : 'opacity-40'}`}
                    >
                      {Number(key.slice(8, 10))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
