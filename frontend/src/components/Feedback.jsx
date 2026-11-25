import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

/** Toast / snackbar stack (aria-live). A toast with an `action` becomes an "Undo" snackbar. */
export function Toaster() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`glass-strong pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
              t.type === 'error' ? 'border-danger-500/60 text-red-100' : t.type === 'success' ? 'border-brand-500/60' : ''
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-lg px-2 py-1 font-semibold text-brand-300 hover:bg-white/10"
                onClick={() => {
                  t.action.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Skeleton({ className = 'h-12 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <p className="text-base font-semibold">{title}</p>
      {message && <p className="mt-1 text-sm text-white/70">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="glass rounded-2xl border-danger-500/40 p-6 text-center">
      <p className="font-semibold text-red-200">{message}</p>
      {onRetry && (
        <button type="button" className="btn-ghost mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Sync status: Offline / Syncing / Synced. */
export function SyncBadge() {
  const online = useAppStore((s) => s.online);
  const pending = useAppStore((s) => s.pendingWrites);
  const state = !online ? 'offline' : pending ? 'syncing' : 'synced';
  const map = {
    offline: { label: 'Offline', dot: 'bg-amber-400', hint: 'Changes are saved on this device and will sync later' },
    syncing: { label: 'Syncing…', dot: 'bg-sky-400 animate-pulse', hint: 'Sending changes to the server' },
    synced: { label: 'Synced', dot: 'bg-brand-500', hint: 'All changes are saved' },
  }[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs"
      title={map.hint}
      role="status"
      aria-label={`Sync status: ${map.label}`}
    >
      <span className={`h-2 w-2 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}
