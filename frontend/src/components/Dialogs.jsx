import Modal from './Modal';

/** Title + message + one dismiss button. Used for success / info results. */
export function MessageDialog({ open, title, message, onClose, buttonLabel = 'Dismiss' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      role="alertdialog"
      footer={
        <button type="button" className="btn-primary" onClick={onClose} data-autofocus>
          {buttonLabel}
        </button>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

/** Cancel / confirm dialog; `danger` renders the confirm button red. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      role="alertdialog"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} data-autofocus>
            Cancel
          </button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {message && <p>{message}</p>}
      {children}
    </Modal>
  );
}

/** Dialog offering a list of choices plus Cancel (shuffle / print / merge-or-replace). */
export function ChoiceDialog({ open, title, message, choices, onChoose, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
      }
    >
      {message && <p className="mb-3">{message}</p>}
      <div className="flex flex-col gap-2">
        {choices.map((c, i) => (
          <button
            key={c.value}
            type="button"
            className="btn-ghost justify-start text-left"
            onClick={() => onChoose(c.value)}
            data-autofocus={i === 0 ? true : undefined}
          >
            <span className="flex flex-col items-start">
              <span>{c.label}</span>
              {c.hint && <span className="text-xs text-white/60">{c.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
