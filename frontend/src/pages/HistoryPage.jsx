import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VariableSizeList } from 'react-window';
import TopBar from '../components/TopBar';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';
import { ChevronDownIcon, SearchIcon, XIcon } from '../components/Icons';
import { SEARCH_DEBOUNCE_MS } from '../config/constants';
import { useDebounced } from '../hooks/useDebounced';
import { useHistory } from '../hooks/useHistory';
import { describeEntry, flattenRows } from '../utils/history';
import { formatLongDate } from '../utils/format';

const HEADER_H = 60;
const CARD_H = 72;

const Row = memo(function Row({ index, style, data }) {
  const row = data.rows[index];
  if (row.type === 'header') {
    return (
      <div style={{ ...style, paddingBottom: 8 }}>
        <button
          type="button"
          aria-expanded={row.open}
          onClick={() => data.toggle(row.date)}
          className="glass flex h-full w-full items-center justify-between rounded-2xl px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <span>
            <span className="block text-sm font-semibold">{formatLongDate(row.date)}</span>
            <span className="block text-xs text-brand-300">
              {row.count} student{row.count === 1 ? '' : 's'}
            </span>
          </span>
          <span className={`transition-transform ${row.open ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>
      </div>
    );
  }
  return (
    <div style={{ ...style, paddingBottom: 8, paddingLeft: 12 }}>
      <div className="flex h-full flex-col justify-center rounded-xl border border-white/10 bg-black/20 px-4">
        <span className="text-sm font-medium">{row.entry.studentName}</span>
        <span className="text-xs text-white/70">{describeEntry(row.entry)}</span>
      </div>
    </div>
  );
});

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const query = useDebounced(search, SEARCH_DEBOUNCE_MS);
  const { days, loading, loadingMore, error, done, searching, loadMore } = useHistory(query);
  const [expanded, setExpanded] = useState(() => new Set());
  const listRef = useRef(null);
  const [height, setHeight] = useState(() => Math.max(320, window.innerHeight - 260));

  useEffect(() => {
    const onResize = () => setHeight(Math.max(320, window.innerHeight - 260));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const searchingText = query.trim().length > 0;
  // While searching, show matching dates expanded so the matches are visible immediately.
  const effectiveExpanded = useMemo(() => (searchingText ? new Set(days.map((d) => d.date)) : expanded), [searchingText, days, expanded]);
  const rows = useMemo(() => flattenRows(days, effectiveExpanded), [days, effectiveExpanded]);

  useEffect(() => {
    if (listRef.current) listRef.current.resetAfterIndex(0, true);
  }, [rows]);

  const toggle = useCallback((date) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  const itemData = useMemo(() => ({ rows, toggle }), [rows, toggle]);
  const itemSize = useCallback((i) => (rows[i].type === 'header' ? HEADER_H : CARD_H), [rows]);

  const onItemsRendered = useCallback(
    ({ visibleStopIndex }) => {
      if (!done && visibleStopIndex >= rows.length - 4) loadMore();
    },
    [done, rows.length, loadMore],
  );

  // If the first pages do not fill the viewport, keep loading.
  useEffect(() => {
    if (!loading && !loadingMore && !done && rows.length * HEADER_H < height) loadMore();
  }, [loading, loadingMore, done, rows.length, height, loadMore]);

  return (
    <>
      <TopBar title="Daily History" />
      <main className="flex flex-col gap-3 p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
          <label htmlFor="history-search" className="sr-only">
            Search history by student name or area
          </label>
          <input
            id="history-search"
            type="search"
            className="input pl-10 pr-10"
            placeholder="Search by student name or area"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search && (
            <button type="button" className="icon-btn absolute right-0 top-0 !h-11" onClick={() => setSearch('')} aria-label="Clear search">
              <XIcon size={18} />
            </button>
          )}
        </div>

        {error ? (
          <ErrorState message="Could not load history." onRetry={loadMore} />
        ) : loading ? (
          <SkeletonList rows={5} />
        ) : days.length === 0 ? (
          searching || loadingMore ? (
            <SkeletonList rows={3} />
          ) : (
            <EmptyState
              title={searchingText ? 'No matches' : 'No history yet'}
              message={searchingText ? `Nothing found for “${query.trim()}”. Older records load as you scroll.` : 'Assignments from past days will appear here.'}
            />
          )
        ) : (
          <div role="list" aria-label="History by date">
            <VariableSizeList
              ref={listRef}
              height={height}
              width="100%"
              itemCount={rows.length}
              itemSize={itemSize}
              itemData={itemData}
              itemKey={(i, data) => (data.rows[i].type === 'header' ? `h-${data.rows[i].date}` : `c-${data.rows[i].entry.id}`)}
              onItemsRendered={onItemsRendered}
              overscanCount={6}
            >
              {Row}
            </VariableSizeList>
            {(loadingMore || searching) && <p className="pt-2 text-center text-xs text-white/60">Loading…</p>}
            {done && !searchingText && <p className="pt-2 text-center text-xs text-white/40">That is all of the history.</p>}
          </div>
        )}
      </main>
    </>
  );
}
