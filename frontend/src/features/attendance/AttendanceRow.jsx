import { memo, useEffect, useState } from 'react';
import { SCHEDULES, STATUS_LABELS } from '../../config/constants';

const STYLES = {
  P: { on: 'bg-brand-500 text-black border-brand-500', label: 'Present' },
  L: { on: 'bg-amber-400 text-black border-amber-400', label: 'Late' },
  A: { on: 'bg-danger-500 text-white border-danger-500', label: 'Absent' },
};

/**
 * One student in today's shift with three toggle buttons (P / L / A). Pressing the active button
 * again clears the mark. Time-in and note are optional and saved when the field loses focus.
 */
function AttendanceRow({ row, disabled, onMark, onClear, onDetails }) {
  const status = row.record ? row.record.status : null;
  const [timeIn, setTimeIn] = useState(row.record?.timeIn || '');
  const [note, setNote] = useState(row.record?.note || '');
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Keep the inputs in sync when another device changes the record.
  useEffect(() => {
    setTimeIn(row.record?.timeIn || '');
    setNote(row.record?.note || '');
  }, [row.record?.timeIn, row.record?.note]);

  const schedule = SCHEDULES[row.scheduleType];
  const saveDetails = () => {
    if (!status) return;
    if ((row.record?.timeIn || '') === timeIn && (row.record?.note || '') === note) return;
    onDetails(row, { timeIn, note });
  };

  return (
    <li className="glass rounded-2xl p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {row.studentName}
            {row.unscheduled && (
              <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-200">Unscheduled</span>
            )}
          </p>
          <p className="truncate text-xs text-white/60">
            {row.areaName} • {schedule ? schedule.shortLabel : row.scheduleType}
          </p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label={`Attendance for ${row.studentName}`}>
          {['P', 'L', 'A'].map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                aria-label={`${STATUS_LABELS[s]}${active ? ' (selected)' : ''}`}
                title={STATUS_LABELS[s]}
                onClick={() => (active ? onClear(row) : onMark(row, s, { timeIn, note }))}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                  active ? STYLES[s].on : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {status && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs text-brand-300 underline-offset-2 hover:underline"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((o) => !o)}
          >
            {detailsOpen ? 'Hide details' : row.record?.timeIn || row.record?.note ? 'Edit time & note' : 'Add time & note'}
          </button>
          {row.record?.markedBy && <span className="ml-2 text-[11px] text-white/40">by {row.record.markedBy}</span>}
          {detailsOpen && (
            <div className="mt-2 grid grid-cols-[110px_1fr] gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-white/60" htmlFor={`time-${row.studentId}`}>
                  Time in
                </label>
                <input
                  id={`time-${row.studentId}`}
                  type="time"
                  className="input"
                  value={timeIn}
                  disabled={disabled}
                  onChange={(e) => setTimeIn(e.target.value)}
                  onBlur={saveDetails}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-white/60" htmlFor={`note-${row.studentId}`}>
                  Note
                </label>
                <input
                  id={`note-${row.studentId}`}
                  type="text"
                  maxLength={200}
                  className="input"
                  value={note}
                  disabled={disabled}
                  placeholder="Optional"
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveDetails}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default memo(AttendanceRow);
