import { useEffect, useMemo, useState } from 'react';
import { subscribeDay } from '../services/attendanceRepo';
import { buildRoster, shiftFor, summarize } from '../utils/attendance';

/** Live attendance for one date merged with that day's scheduled shift. */
export function useAttendanceDay(dateKey, weekAssignments) {
  const [state, setState] = useState({ records: [], day: null, meta: null, lastUpdated: null, loading: true, error: null });

  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return subscribeDay(
      dateKey,
      (data) => setState({ ...data, loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [dateKey]);

  const shift = useMemo(() => shiftFor(dateKey, weekAssignments), [dateKey, weekAssignments]);
  const rows = useMemo(() => buildRoster(shift, state.records), [shift, state.records]);
  const summary = useMemo(() => summarize(rows), [rows]);

  return { ...state, shift, rows, summary, confirmed: Boolean(state.day && state.day.confirmed) };
}
