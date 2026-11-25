import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Accordion from '../components/Accordion';
import { ChoiceDialog, ConfirmDialog, MessageDialog } from '../components/Dialogs';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';
import { CopyIcon, PlusIcon, SearchIcon, ShuffleIcon, TrashIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import AreaRow from '../features/assignments/AreaRow';
import AddStudentModal from '../features/students/AddStudentModal';
import { SCHEDULES, SCHEDULE_ORDER, SEARCH_DEBOUNCE_MS } from '../config/constants';
import { useAppStore, isAdminRole } from '../store/useAppStore';
import { useDebounced } from '../hooks/useDebounced';
import { useWeek } from '../hooks/useWeek';
import { useWeekActions } from '../hooks/useWeekActions';
import { useWeekContext } from '../hooks/useWeekContext';
import { buildSections, findOrphans } from '../utils/grouping';
import { formatWeekOf } from '../utils/format';
import { nextWeekId, previousWeekId as prevWeek } from '../utils/weeks';

const Section = memo(function Section({ section, open, onToggle, canEdit, onRemove }) {
  const meta = SCHEDULES[section.scheduleType];
  return (
    <Accordion title={meta.label} subtitle={meta.timeLabel} badge={section.total} open={open} onToggle={onToggle}>
      {section.rows.length ? (
        <div className="divide-y divide-white/5">
          {section.rows.map(({ area, students }) => (
            <AreaRow key={area.id} area={area} students={students} canEdit={canEdit} onRemove={onRemove} />
          ))}
        </div>
      ) : (
        <p className="py-2 text-sm text-white/60">No areas to show.</p>
      )}
    </Accordion>
  );
});

export default function WeeklyPage() {
  const navigate = useNavigate();
  const role = useAppStore((s) => s.role);
  const areas = useAppStore((s) => s.areas);
  const areasLoaded = useAppStore((s) => s.areasLoaded);
  const toast = useAppStore((s) => s.toast);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const focusTick = useAppStore((s) => s.focusSearchTick);
  const canEdit = isAdminRole(role);

  const { weekId, previousWeekId, today } = useWeekContext();
  const { assignments, loading, error } = useWeek(weekId);
  const actions = useWeekActions({ weekId, previousWeekId, assignments });

  const [search, setSearch] = useState('');
  const query = useDebounced(search, SEARCH_DEBOUNCE_MS);
  const searchRef = useRef(null);
  const [open, setOpen] = useState({ MWF: true, EVERYDAY: true, MONTHLY: true });
  const [dialog, setDialog] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (focusTick > 0 && searchRef.current) searchRef.current.focus();
  }, [focusTick]);

  const sections = useMemo(() => buildSections({ areas, assignments, query }), [areas, assignments, query]);
  const orphans = useMemo(() => findOrphans({ areas, assignments }), [areas, assignments]);
  const filteredOrphans = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? orphans.filter((o) => o.studentName.toLowerCase().includes(q) || o.areaName.toLowerCase().includes(q)) : orphans;
  }, [orphans, query]);
  const searching = query.trim().length > 0;
  const noMatches = searching && sections.every((s) => s.rows.length === 0) && filteredOrphans.length === 0;

  const closeDialog = () => setDialog(null);

  // ---- action handlers -------------------------------------------------------------------
  const handleAssign = async (input) => {
    const result = await actions.addStudent(input);
    if (result.ok) {
      setAddOpen(false);
      toast(`${result.name} assigned to ${result.areaName}`, { type: 'success' });
      setOpen((o) => ({ ...o, [input.scheduleType]: true }));
    }
    return result;
  };

  const handleShuffle = async (scheduleType) => {
    setDialog(null);
    const res = await actions.shuffle(scheduleType);
    const label = SCHEDULES[scheduleType].shortLabel;
    if (res.status === 'empty') {
      setDialog({ type: 'message', title: 'Nothing to Shuffle', message: `There are no ${label} assignments for this week yet.` });
    } else if (res.status === 'no-areas') {
      setDialog({ type: 'message', title: 'No Areas', message: `The ${label} schedule has no active areas. Add some in Manage Areas.` });
    } else {
      setDialog({ type: 'message', title: 'Shuffle Complete', message: `${label} assignments were re-shuffled for ${formatWeekOf(weekId)}.` });
    }
  };

  const handleClear = async () => {
    setDialog(null);
    const count = await actions.clearCurrentWeek();
    setDialog({
      type: 'message',
      title: 'Week Cleared',
      message: count
        ? `All ${count} assignment${count === 1 ? '' : 's'} for ${formatWeekOf(weekId)} were removed. Attendance history was kept.`
        : `There were no assignments to clear for ${formatWeekOf(weekId)}.`,
    });
  };

  const startDuplicate = async () => {
    let previous;
    try {
      previous = await actions.loadPrevious();
    } catch {
      toast('Could not load last week. Check your connection.', { type: 'error' });
      return;
    }
    if (!previous.length) {
      setDialog({
        type: 'message',
        title: 'No Records Found',
        message: 'There are no student assignments from the previous week to duplicate.',
      });
    } else if (assignments.length) {
      setDialog({ type: 'dupChoice', previous });
    } else {
      finishDuplicate(previous, 'replace');
    }
  };

  const finishDuplicate = (previous, mode) => {
    const res = actions.duplicate(previous, mode);
    setDialog({
      type: 'message',
      title: 'Last Week Duplicated',
      message:
        `${res.created} assignment${res.created === 1 ? '' : 's'} copied from last week` +
        (res.skipped ? ` (${res.skipped} skipped: already assigned or no area available).` : '.'),
    });
  };

  const goWeek = (id) => setSelectedDate(id);

  // ---- render ----------------------------------------------------------------------------
  const topActions = (
    <div className="flex">
      <button type="button" className="icon-btn" disabled={!canEdit} onClick={startDuplicate} aria-label="Duplicate last week" title="Duplicate last week">
        <CopyIcon />
      </button>
      <button type="button" className="icon-btn" disabled={!canEdit} onClick={() => setDialog({ type: 'clear' })} aria-label="Clear current week" title="Clear current week">
        <TrashIcon />
      </button>
      <button type="button" className="icon-btn" disabled={!canEdit} onClick={() => setDialog({ type: 'shuffle' })} aria-label="Shuffle assignments" title="Shuffle assignments">
        <ShuffleIcon />
      </button>
    </div>
  );

  return (
    <>
      <TopBar title="SA Manager" script actions={topActions} />
      <main className="flex flex-col gap-3 p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
          <label htmlFor="student-search" className="sr-only">
            Search students or areas
          </label>
          <input
            id="student-search"
            ref={searchRef}
            type="search"
            className="input pl-10 pr-10"
            placeholder="Search students or areas"
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

        <div className="flex items-center justify-between">
          <button type="button" className="icon-btn" onClick={() => goWeek(prevWeek(weekId))} aria-label="Previous week">
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-center text-sm font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            onClick={() => navigate('/calendar')}
            aria-label={`${formatWeekOf(weekId)}. Open calendar`}
          >
            {formatWeekOf(weekId)}
            {weekIdIsCurrent(weekId, today) && <span className="ml-2 rounded-full bg-brand-700/60 px-2 py-0.5 text-xs">This week</span>}
          </button>
          <button type="button" className="icon-btn" onClick={() => goWeek(nextWeekId(weekId))} aria-label="Next week">
            <ChevronRightIcon />
          </button>
        </div>

        {error ? (
          <ErrorState message="Could not load this week's assignments." onRetry={() => window.location.reload()} />
        ) : loading || !areasLoaded ? (
          <SkeletonList rows={3} />
        ) : areas.length === 0 ? (
          <EmptyState
            title="No areas yet"
            message={canEdit ? 'Add your cleaning areas to start assigning students.' : 'An admin needs to add cleaning areas first.'}
            action={canEdit && <button type="button" className="btn-primary" onClick={() => navigate('/areas')}>Manage Areas</button>}
          />
        ) : noMatches ? (
          <EmptyState title="No matches" message={`Nothing found for “${query.trim()}” in this week.`} />
        ) : (
          <>
            {assignments.length === 0 && !searching && (
              <p className="px-1 text-center text-sm text-white/60">
                No assignments for this week yet.{canEdit ? ' Tap + to add a student or duplicate last week.' : ''}
              </p>
            )}
            {sections
              .filter((s) => !searching || s.rows.length > 0)
              .map((section) => (
                <Section
                  key={section.scheduleType}
                  section={section}
                  open={open[section.scheduleType] || section.autoExpand}
                  onToggle={() => setOpen((o) => ({ ...o, [section.scheduleType]: !o[section.scheduleType] }))}
                  canEdit={canEdit}
                  onRemove={actions.removeStudent}
                />
              ))}
            {filteredOrphans.length > 0 && (
              <section className="glass rounded-2xl p-4" aria-label="Students in removed areas">
                <p className="text-sm font-semibold">In removed areas</p>
                <p className="text-xs text-white/60">These students are assigned to an area that was deleted. Remove them or shuffle their schedule.</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {filteredOrphans.map((o) => (
                    <li key={o.id} className="chip">
                      <span>
                        {o.studentName} <span className="text-white/60">· {o.areaName}</span>
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-danger-600/90"
                          aria-label={`Remove ${o.studentName}`}
                          onClick={() => actions.removeStudent(o)}
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      {canEdit && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add student"
          className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-black shadow-glass transition hover:bg-brand-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300/50"
        >
          <PlusIcon size={28} />
        </button>
      )}

      <AddStudentModal open={addOpen} onClose={() => setAddOpen(false)} onAssign={handleAssign} />

      <ChoiceDialog
        open={dialog?.type === 'shuffle'}
        title="Shuffle Assignments"
        message="Which schedule would you like to re-shuffle for this week?"
        choices={SCHEDULE_ORDER.map((id) => ({ value: id, label: SCHEDULES[id].optionLabel }))}
        onChoose={handleShuffle}
        onClose={closeDialog}
      />
      <ConfirmDialog
        open={dialog?.type === 'clear'}
        title="Clear Current Week?"
        message={`This removes every assignment for ${formatWeekOf(weekId)}. Attendance history is not affected.`}
        confirmLabel="Clear All"
        danger
        onConfirm={handleClear}
        onClose={closeDialog}
      />
      <ChoiceDialog
        open={dialog?.type === 'dupChoice'}
        title="This week already has assignments"
        message="How should last week's assignments be added?"
        choices={[
          { value: 'merge', label: 'Merge', hint: 'Keep current assignments, add students that are missing' },
          { value: 'replace', label: 'Replace', hint: 'Remove current assignments and copy last week exactly' },
        ]}
        onChoose={(mode) => {
          const previous = dialog.previous;
          setDialog(null);
          finishDuplicate(previous, mode);
        }}
        onClose={closeDialog}
      />
      <MessageDialog open={dialog?.type === 'message'} title={dialog?.title} message={dialog?.message} onClose={closeDialog} />
    </>
  );
}

/** The shown week is the current one when today falls within the 7 days starting at weekId. */
function weekIdIsCurrent(weekId, today) {
  const start = new Date(`${weekId}T00:00:00Z`).getTime();
  const t = new Date(`${today}T00:00:00Z`).getTime();
  return t >= start && t < start + 7 * 86400000;
}
