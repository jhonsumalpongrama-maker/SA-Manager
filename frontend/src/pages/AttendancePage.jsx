import { useCallback, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { ConfirmDialog } from '../components/Dialogs';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';
import { LockIcon } from '../components/Icons';
import AttendanceRow from '../features/attendance/AttendanceRow';
import AttendanceDashboard from '../features/attendance/AttendanceDashboard';
import { useAppStore, isAdminRole } from '../store/useAppStore';
import { useAttendanceDay } from '../hooks/useAttendanceDay';
import { useWeek } from '../hooks/useWeek';
import { useWeekContext } from '../hooks/useWeekContext';
import { clearStatus, confirmDay, markStatus, unlockDay } from '../services/attendanceRepo';
import { formatLongDate, formatTime } from '../utils/format';
import { isValidDateKey, weekIdFor } from '../utils/weeks';

export default function AttendancePage() {
  const user = useAppStore((s) => s.user);
  const role = useAppStore((s) => s.role);
  const toast = useAppStore((s) => s.toast);
  const canEdit = isAdminRole(role);
  const { today, settings } = useWeekContext();

  const [dateKey, setDateKey] = useState(today);
  const weekId = useMemo(() => weekIdFor(dateKey, settings.weekStartsOn), [dateKey, settings.weekStartsOn]);
  const { assignments, loading: weekLoading, error: weekError } = useWeek(weekId);
  const att = useAttendanceDay(dateKey, assignments);
  const [dialog, setDialog] = useState(null);
  const [markRemainingAbsent, setMarkRemainingAbsent] = useState(false);

  const actor = user ? user.email : '';
  const locked = att.confirmed;
  const disabled = !canEdit || locked;

  const fail = useCallback((msg) => () => toast(msg, { type: 'error' }), [toast]);

  const onMark = useCallback(
    (row, status, { timeIn, note }) => {
      markStatus({ dateKey, row, status, markedBy: actor, timeIn, note }).catch(fail('Could not save attendance. The day may be locked.'));
    },
    [dateKey, actor, fail],
  );
  const onClear = useCallback(
    (row) => {
      clearStatus(dateKey, row.studentId).catch(fail('Could not clear the mark.'));
    },
    [dateKey, fail],
  );
  const onDetails = useCallback(
    (row, { timeIn, note }) => {
      markStatus({ dateKey, row, status: row.record.status, markedBy: actor, timeIn, note }).catch(fail('Could not save details.'));
    },
    [dateKey, actor, fail],
  );

  const doConfirm = () => {
    setDialog(null);
    confirmDay({ dateKey, rows: att.rows, markedBy: actor, markRemainingAbsent })
      .then(() => toast('Attendance confirmed and locked.', { type: 'success' }))
      .catch(fail('Could not confirm attendance.'));
    setMarkRemainingAbsent(false);
  };
  const doUnlock = () => {
    setDialog(null);
    unlockDay({ dateKey, records: att.records, markedBy: actor })
      .then(() => toast('Day unlocked. Attendance can be edited again.', { type: 'success' }))
      .catch(fail('Could not unlock the day.'));
  };

  const status = !att.meta ? '…' : att.meta.fromCache ? 'Offline copy' : 'Live';

  return (
    <>
      <TopBar title="Daily Attendance" />
      <main className="flex flex-col gap-4 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="att-date" className="mb-1 block text-xs text-white/70">
              Date
            </label>
            <input
              id="att-date"
              type="date"
              className="input"
              value={dateKey}
              onChange={(e) => isValidDateKey(e.target.value) && setDateKey(e.target.value)}
            />
          </div>
          <div className="pb-2 text-right text-xs" role="status" aria-live="polite">
            <p className="flex items-center justify-end gap-1.5">
              <span className={`h-2 w-2 rounded-full ${status === 'Live' ? 'animate-pulse bg-brand-500' : 'bg-amber-400'}`} />
              {status}
            </p>
            {att.lastUpdated && <p className="text-white/50">Updated {formatTime(att.lastUpdated)}</p>}
          </div>
        </div>

        <h2 className="text-sm font-semibold text-brand-300">
          Today&apos;s Shift <span className="font-normal text-white/60">· {formatLongDate(dateKey)}</span>
        </h2>

        {locked && (
          <div className="glass flex items-center justify-between gap-3 rounded-2xl border-brand-500/40 p-3 text-sm" role="status">
            <span className="flex items-center gap-2">
              <LockIcon size={18} /> Confirmed{att.day?.confirmedBy ? ` by ${att.day.confirmedBy}` : ''}. This day is locked.
            </span>
            {canEdit && (
              <button type="button" className="btn-ghost !min-h-[40px]" onClick={() => setDialog('unlock')}>
                Unlock
              </button>
            )}
          </div>
        )}

        {weekError || att.error ? (
          <ErrorState message="Could not load attendance." onRetry={() => window.location.reload()} />
        ) : weekLoading || att.loading ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            <AttendanceDashboard summary={att.summary} dateKey={dateKey} />
            {att.rows.length === 0 ? (
              <EmptyState title="Nobody is scheduled" message="No students are assigned to work on this date. Check the weekly assignments." />
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Students on shift">
                {att.rows.map((row) => (
                  <AttendanceRow key={row.studentId} row={row} disabled={disabled} onMark={onMark} onClear={onClear} onDetails={onDetails} />
                ))}
              </ul>
            )}
            {canEdit && !locked && att.rows.length > 0 && (
              <button type="button" className="btn-primary w-full" onClick={() => setDialog('confirm')}>
                Confirm Attendance
              </button>
            )}
            {!canEdit && <p className="text-center text-xs text-white/50">View only: only admins can mark attendance.</p>}
          </>
        )}
      </main>

      <ConfirmDialog
        open={dialog === 'confirm'}
        title="Confirm Attendance?"
        message={
          att.summary.unmarked > 0
            ? `${att.summary.unmarked} student${att.summary.unmarked === 1 ? ' is' : 's are'} not marked yet. Confirming locks this day; only an admin can unlock it.`
            : 'This saves the day and locks it. Only an admin can unlock it again.'
        }
        confirmLabel="Confirm & Lock"
        onConfirm={doConfirm}
        onClose={() => setDialog(null)}
      >
        {att.summary.unmarked > 0 && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-green-600" checked={markRemainingAbsent} onChange={(e) => setMarkRemainingAbsent(e.target.checked)} />
            Mark everyone not yet marked as Absent
          </label>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'unlock'}
        title="Unlock this day?"
        message="Attendance for this date becomes editable again until it is re-confirmed."
        confirmLabel="Unlock"
        onConfirm={doUnlock}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
