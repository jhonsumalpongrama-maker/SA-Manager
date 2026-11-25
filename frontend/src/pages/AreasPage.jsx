import { useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { ConfirmDialog } from '../components/Dialogs';
import { EmptyState, SkeletonList } from '../components/Feedback';
import { SCHEDULES, SCHEDULE_ORDER } from '../config/constants';
import { useAppStore } from '../store/useAppStore';
import { addArea, deactivateArea, hardDeleteArea, reactivateArea, renameArea, reorderAreas } from '../services/areasRepo';
import { ChevronDownIcon } from '../components/Icons';

function AreaItem({ area, index, count, onMove, onRename, onToggle, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(area.name);
  const inactive = area.active === false;

  const save = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== area.name) onRename(area, trimmed);
    setEditing(false);
  };

  return (
    <li className={`flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2 ${inactive ? 'opacity-60' : ''}`}>
      <div className="flex flex-col">
        <button type="button" className="icon-btn !h-6 !w-9 rotate-180" disabled={index === 0} onClick={() => onMove(area, -1)} aria-label={`Move ${area.name} up`}>
          <ChevronDownIcon size={16} />
        </button>
        <button type="button" className="icon-btn !h-6 !w-9" disabled={index === count - 1} onClick={() => onMove(area, 1)} aria-label={`Move ${area.name} down`}>
          <ChevronDownIcon size={16} />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <>
            <label className="sr-only" htmlFor={`rename-${area.id}`}>
              Area name
            </label>
            <input
              id={`rename-${area.id}`}
              className="input"
              value={name}
              maxLength={60}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          </>
        ) : (
          <p className="truncate text-sm">
            {area.name} {inactive && <span className="text-xs text-white/60">(hidden)</span>}
          </p>
        )}
      </div>
      {editing ? (
        <button type="button" className="btn-primary !min-h-[40px]" onClick={save}>
          Save
        </button>
      ) : (
        <div className="flex gap-1">
          <button type="button" className="btn-ghost !min-h-[40px] !px-3" onClick={() => { setName(area.name); setEditing(true); }} aria-label={`Rename ${area.name}`}>
            Rename
          </button>
          <button type="button" className="btn-ghost !min-h-[40px] !px-3" onClick={() => onToggle(area)} aria-label={`${inactive ? 'Restore' : 'Hide'} ${area.name}`}>
            {inactive ? 'Restore' : 'Hide'}
          </button>
          <button type="button" className="btn-ghost !min-h-[40px] !px-3 text-red-300" onClick={() => onDelete(area)} aria-label={`Delete ${area.name}`}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function AddArea({ scheduleType, nextOrder, onAdd }) {
  const [name, setName] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, scheduleType, order: nextOrder });
    setName('');
  };
  return (
    <form onSubmit={submit} className="mt-2 flex gap-2">
      <label className="sr-only" htmlFor={`add-${scheduleType}`}>
        New {SCHEDULES[scheduleType].label} area
      </label>
      <input id={`add-${scheduleType}`} className="input" placeholder="New area name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      <button type="submit" className="btn-primary" disabled={!name.trim()}>
        Add
      </button>
    </form>
  );
}

/** Admin CRUD for cleaning areas: add, rename, reorder, hide/restore, delete. */
export default function AreasPage() {
  const areas = useAppStore((s) => s.areas);
  const loaded = useAppStore((s) => s.areasLoaded);
  const toast = useAppStore((s) => s.toast);
  const [pendingDelete, setPendingDelete] = useState(null);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        SCHEDULE_ORDER.map((t) => [
          t,
          areas.filter((a) => a.scheduleType === t).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
        ]),
      ),
    [areas],
  );

  const fail = (msg) => () => toast(msg, { type: 'error' });

  const move = (area, delta) => {
    const list = grouped[area.scheduleType].slice();
    const i = list.findIndex((a) => a.id === area.id);
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    reorderAreas(list).catch(fail('Could not reorder areas.'));
  };

  return (
    <>
      <TopBar title="Manage Areas" />
      <main className="flex flex-col gap-4 p-4">
        <p className="text-sm text-white/70">
          Changes apply to new assignments straight away. Hiding an area keeps past weeks and history readable; deleting removes the area
          itself (students still in it move to the &quot;In removed areas&quot; list).
        </p>
        {!loaded ? (
          <SkeletonList rows={3} />
        ) : (
          SCHEDULE_ORDER.map((t) => (
            <section key={t} className="glass rounded-2xl p-4" aria-labelledby={`h-${t}`}>
              <h2 id={`h-${t}`} className="text-base font-semibold">
                {SCHEDULES[t].label} <span className="text-xs font-normal text-brand-300">{SCHEDULES[t].timeLabel}</span>
              </h2>
              {grouped[t].length === 0 ? (
                <div className="mt-2">
                  <EmptyState title="No areas" message="Add the first area below." />
                </div>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {grouped[t].map((a, i) => (
                    <AreaItem
                      key={a.id}
                      area={a}
                      index={i}
                      count={grouped[t].length}
                      onMove={move}
                      onRename={(area, name) => {
                        try {
                          renameArea(area.id, name).catch(fail('Could not rename the area.'));
                        } catch (e) {
                          toast(e.message, { type: 'error' });
                        }
                      }}
                      onToggle={(area) => (area.active === false ? reactivateArea(area.id) : deactivateArea(area.id)).catch(fail('Could not update the area.'))}
                      onDelete={setPendingDelete}
                    />
                  ))}
                </ul>
              )}
              <AddArea
                scheduleType={t}
                nextOrder={grouped[t].length}
                onAdd={(a) => {
                  try {
                    addArea(a).catch(fail('Could not add the area.'));
                    toast('Area added', { type: 'success' });
                  } catch (e) {
                    toast(e.message, { type: 'error' });
                  }
                }}
              />
            </section>
          ))
        )}
      </main>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this area?"
        message={pendingDelete ? `“${pendingDelete.name}” will be removed. Students currently assigned to it need to be re-assigned. Use Hide instead to keep history intact.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          hardDeleteArea(pendingDelete.id).catch(fail('Could not delete the area.'));
          setPendingDelete(null);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
