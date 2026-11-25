import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ChevronLeftIcon, MenuIcon } from './Icons';
import { SyncBadge } from './Feedback';

/** Sticky glass top bar: hamburger (or back), centered title, optional action icons. */
export default function TopBar({ title, actions = null, back = false, script = false }) {
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen);
  const navigate = useNavigate();
  return (
    <header className="glass sticky top-0 z-30 border-x-0 border-t-0 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
        {back ? (
          <button type="button" className="icon-btn" onClick={() => navigate('/')} aria-label="Back to weekly assignments">
            <ChevronLeftIcon />
          </button>
        ) : (
          <button type="button" className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-haspopup="dialog">
            <MenuIcon />
          </button>
        )}
        <h1 className={`truncate text-center ${script ? 'font-script text-3xl' : 'text-lg font-semibold'}`}>{title}</h1>
        <div className="flex items-center justify-end">{actions || <span className="w-11" />}</div>
      </div>
      <div className="flex justify-center pt-1">
        <SyncBadge />
      </div>
    </header>
  );
}
