import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from './Icons';

/** Controlled accordion section following the WAI-ARIA disclosure pattern. */
export default function Accordion({ title, subtitle, badge, open, onToggle, children }) {
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  return (
    <section className="glass overflow-hidden rounded-2xl">
      <h2>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300"
        >
          <span>
            <span className="block text-base font-semibold text-white">{title}</span>
            {subtitle && <span className="block text-xs text-brand-300">{subtitle}</span>}
          </span>
          <span className="flex items-center gap-3">
            {badge != null && (
              <span className="rounded-full bg-brand-700/60 px-2.5 py-0.5 text-xs font-medium" aria-label={`${badge} students`}>
                {badge}
              </span>
            )}
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDownIcon />
            </motion.span>
          </span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-4 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
