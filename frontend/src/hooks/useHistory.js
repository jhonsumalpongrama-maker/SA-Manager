import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWeeksPage, searchAssignments } from '../services/historyRepo';
import { expandHistory, filterHistory } from '../utils/history';
import { useAppStore } from '../store/useAppStore';
import { todayKey } from '../utils/weeks';

/**
 * Daily history: pages weeks from Firestore on demand and expands them to per-day entries.
 * When `query` is set it also runs indexed prefix searches over every week, so matches show up
 * even in history that has not been paged in yet.
 */
export function useHistory(query) {
  const timezone = useAppStore((s) => s.settings.timezone);
  const [pages, setPages] = useState({ weeks: [], cursor: null, done: false });
  const [status, setStatus] = useState({ loading: true, loadingMore: false, error: null });
  const [remote, setRemote] = useState([]);
  const [searching, setSearching] = useState(false);
  const busy = useRef(false);
  const cursorRef = useRef(null);
  const doneRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || doneRef.current) return;
    busy.current = true;
    setStatus((s) => ({ ...s, loadingMore: true, error: null }));
    try {
      // A page can contain only empty weeks; keep going (bounded) until something is visible.
      for (let attempt = 0; attempt < 4 && !doneRef.current; attempt += 1) {
        // eslint-disable-next-line no-await-in-loop
        const page = await fetchWeeksPage(cursorRef.current);
        cursorRef.current = page.cursor;
        doneRef.current = page.done;
        setPages((p) => ({ weeks: [...p.weeks, ...page.weeks], cursor: page.cursor, done: page.done }));
        if (page.weeks.some((w) => w.assignments.length > 0)) break;
      }
      setStatus({ loading: false, loadingMore: false, error: null });
    } catch (error) {
      setStatus({ loading: false, loadingMore: false, error });
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  const term = query.trim();
  useEffect(() => {
    let cancelled = false;
    if (!term) {
      setRemote([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    searchAssignments(term)
      .then((hits) => !cancelled && setRemote(hits))
      .catch(() => !cancelled && setRemote([]))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [term]);

  const days = useMemo(() => {
    const byWeek = new Map();
    const put = (weekId, a) => {
      if (!byWeek.has(weekId)) byWeek.set(weekId, new Map());
      byWeek.get(weekId).set(a.id, a);
    };
    pages.weeks.forEach((w) => w.assignments.forEach((a) => put(w.weekId, a)));
    if (term) remote.forEach((h) => put(h.weekId, h.assignment));
    const weeks = [...byWeek.entries()].map(([weekId, m]) => ({ weekId, assignments: [...m.values()] }));
    const expanded = expandHistory(weeks, todayKey(timezone));
    return term ? filterHistory(expanded, term) : expanded;
  }, [pages.weeks, remote, term, timezone]);

  return { days, ...status, done: pages.done, searching, loadMore };
}
