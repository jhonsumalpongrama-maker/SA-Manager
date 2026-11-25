import { useEffect, useState } from 'react';
import { subscribeWeek } from '../services/assignmentsRepo';
import { useAppStore } from '../store/useAppStore';

/** Live assignments for one week, with loading / error state and sync metadata. */
export function useWeek(weekId) {
  const [state, setState] = useState({ assignments: [], loading: true, error: null, meta: null });
  const setPendingWrites = useAppStore((s) => s.setPendingWrites);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const unsub = subscribeWeek(
      weekId,
      (assignments, meta) => {
        setState({ assignments, loading: false, error: null, meta });
        setPendingWrites(meta.hasPendingWrites);
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    return unsub;
  }, [weekId, setPendingWrites]);

  return state;
}
