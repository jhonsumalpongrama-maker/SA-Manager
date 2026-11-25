import { useEffect, useState } from 'react';
import { fetchRange } from '../../services/attendanceRepo';
import { attendanceRates } from '../../utils/attendance';
import { addDays } from '../../utils/weeks';
import { formatPercent } from '../../utils/format';

const TILES = [
  { key: 'P', label: 'Present', color: 'text-brand-300' },
  { key: 'L', label: 'Late', color: 'text-amber-300' },
  { key: 'A', label: 'Absent', color: 'text-red-300' },
  { key: 'unmarked', label: 'Not yet marked', color: 'text-white/70' },
];

/** Counts for the selected day, plus per-student attendance rate over the last 30 days. */
export default function AttendanceDashboard({ summary, dateKey }) {
  const [rates, setRates] = useState({ loading: true, error: false, rows: [] });

  useEffect(() => {
    let cancelled = false;
    setRates((r) => ({ ...r, loading: true, error: false }));
    fetchRange(addDays(dateKey, -29), dateKey)
      .then((records) => !cancelled && setRates({ loading: false, error: false, rows: attendanceRates(records) }))
      .catch(() => !cancelled && setRates({ loading: false, error: true, rows: [] }));
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  return (
    <section aria-label="Attendance summary" className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {TILES.map((t) => (
          <div key={t.key} className="glass rounded-2xl p-3 text-center">
            <p className={`text-2xl font-bold ${t.color}`}>{summary[t.key]}</p>
            <p className="text-[11px] leading-tight text-white/70">{t.label}</p>
          </div>
        ))}
      </div>

      <details className="glass rounded-2xl p-3">
        <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
          Attendance rate (last 30 days)
        </summary>
        <div className="mt-3">
          {rates.loading ? (
            <p className="text-xs text-white/60">Loading…</p>
          ) : rates.error ? (
            <p className="text-xs text-red-300">Could not load attendance rates.</p>
          ) : rates.rows.length === 0 ? (
            <p className="text-xs text-white/60">No confirmed or marked attendance in this period yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rates.rows.map((r) => (
                <li key={r.studentId}>
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{r.studentName}</span>
                    <span className="text-white/70">
                      {formatPercent(r.rate)} · {r.P}P {r.L}L {r.A}A
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(r.rate * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.studentName} attendance rate`}>
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${r.rate * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-white/40">Rate = (Present + Late) ÷ days marked. Unmarked days are not counted.</p>
        </div>
      </details>
    </section>
  );
}
