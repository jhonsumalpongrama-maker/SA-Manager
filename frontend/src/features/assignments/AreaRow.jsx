import { memo } from 'react';
import { XIcon } from '../../components/Icons';

const StudentChip = memo(function StudentChip({ assignment, canEdit, onRemove }) {
  return (
    <li className="chip">
      <span>{assignment.studentName}</span>
      {canEdit ? (
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-danger-600/90 text-white hover:bg-danger-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={`Remove ${assignment.studentName} from ${assignment.areaName}`}
          onClick={() => onRemove(assignment)}
        >
          <XIcon size={14} />
        </button>
      ) : (
        <span className="w-2" />
      )}
    </li>
  );
});

/** One area: its name and the removable chips of every student assigned to it. */
function AreaRow({ area, students, canEdit, onRemove }) {
  return (
    <div className="py-2">
      <p className="text-sm font-medium text-white">{area.name}</p>
      {students.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-2" aria-label={`Students in ${area.name}`}>
          {students.map((s) => (
            <StudentChip key={s.id} assignment={s} canEdit={canEdit} onRemove={onRemove} />
          ))}
        </ul>
      ) : (
        <p className="mt-0.5 text-xs text-white/50">No students assigned</p>
      )}
    </div>
  );
}

export default memo(AreaRow);
