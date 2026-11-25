import { useEffect, useId, useState } from 'react';
import Modal from '../../components/Modal';
import { SCHEDULES, SCHEDULE_ORDER, MAX_NAME_LENGTH } from '../../config/constants';
import { useAppStore } from '../../store/useAppStore';

/** "Add New Student" dialog: full name + schedule, validated by the caller's `onAssign`. */
export default function AddStudentModal({ open, onClose, onAssign }) {
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const students = useAppStore((s) => s.students);
  const nameId = useId();
  const scheduleId = useId();
  const listId = useId();
  const errorId = useId();

  useEffect(() => {
    if (open) {
      setName('');
      setScheduleType('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await onAssign({ name, scheduleType });
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Student"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="add-student-form" className="btn-primary" disabled={busy}>
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </>
      }
    >
      <form id="add-student-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor={nameId} className="mb-1 block text-xs text-white/70">
            Full Name
          </label>
          <input
            id={nameId}
            data-autofocus
            className="input"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            list={listId}
            autoComplete="off"
            placeholder="e.g. Juan Dela Cruz"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
          <datalist id={listId}>
            {students.slice(0, 200).map((s) => (
              <option key={s.id} value={s.fullName} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={scheduleId} className="mb-1 block text-xs text-white/70">
            Select Schedule
          </label>
          <select
            id={scheduleId}
            className="input"
            value={scheduleType}
            onChange={(e) => {
              setScheduleType(e.target.value);
              setError('');
            }}
          >
            <option value="" disabled>
              Select schedule…
            </option>
            {SCHEDULE_ORDER.map((id) => (
              <option key={id} value={id} className="bg-[#0c2815]">
                {SCHEDULES[id].optionLabel}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
