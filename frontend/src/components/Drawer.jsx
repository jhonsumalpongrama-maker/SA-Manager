import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore, isAdminRole } from '../store/useAppStore';
import { logout } from '../services/authRepo';
import {
  CalendarIcon,
  ClipboardCheckIcon,
  HistoryIcon,
  InfoIcon,
  LogoutIcon,
  MapPinIcon,
  PrinterIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from './Icons';

function Logo({ url, label }) {
  if (!url) {
    return (
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] text-white/60"
        aria-hidden="true"
      >
        {label}
      </div>
    );
  }
  return <img src={url} alt={`${label} logo`} className="h-14 w-14 rounded-full border border-white/20 bg-white/10 object-contain" />;
}

export default function Drawer() {
  const open = useAppStore((s) => s.drawerOpen);
  const setOpen = useAppStore((s) => s.setDrawerOpen);
  const settings = useAppStore((s) => s.settings);
  const role = useAppStore((s) => s.role);
  const user = useAppStore((s) => s.user);
  const setDialog = useAppStore((s) => s.setActiveDialog);
  const requestSearchFocus = useAppStore((s) => s.requestSearchFocus);
  const navigate = useNavigate();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => closeRef.current && closeRef.current.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, setOpen]);

  const close = () => setOpen(false);
  const itemClass = ({ isActive }) =>
    `flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
      isActive ? 'bg-white/10 text-brand-300' : 'text-white/90'
    }`;
  const buttonClass =
    'flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <motion.nav
            aria-label="Main navigation"
            className="glass-strong absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col rounded-r-3xl p-5"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <Logo url={settings.schoolLogoUrl} label="School" />
                <Logo url={settings.orgLogoUrl} label="Org" />
              </div>
              <button ref={closeRef} type="button" className="icon-btn -mr-2 -mt-2" onClick={close} aria-label="Close menu">
                <XIcon />
              </button>
            </div>
            <p className="mt-4 font-script text-3xl text-white">SA Manager</p>
            <p className="truncate text-xs text-white/60">
              {user ? user.email : ''} {role ? `• ${role}` : ''}
            </p>

            <ul className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto">
              <li>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    close();
                    navigate('/');
                    requestSearchFocus();
                  }}
                >
                  <SearchIcon /> Search Students
                </button>
              </li>
              <li>
                <NavLink to="/calendar" className={itemClass} onClick={close}>
                  <CalendarIcon /> Calendar
                </NavLink>
              </li>
              <li>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    close();
                    setDialog('print');
                  }}
                >
                  <PrinterIcon /> Print PDF
                </button>
              </li>
              <li>
                <NavLink to="/history" className={itemClass} onClick={close}>
                  <HistoryIcon /> History
                </NavLink>
              </li>
              <li>
                <NavLink to="/attendance" className={itemClass} onClick={close}>
                  <ClipboardCheckIcon /> Mark Attendance
                </NavLink>
              </li>
              {isAdminRole(role) && (
                <>
                  <li>
                    <NavLink to="/areas" className={itemClass} onClick={close}>
                      <MapPinIcon /> Manage Areas
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/settings" className={itemClass} onClick={close}>
                      <SettingsIcon /> Settings &amp; Users
                    </NavLink>
                  </li>
                </>
              )}
              <li>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    close();
                    setDialog('about');
                  }}
                >
                  <InfoIcon /> App Info
                </button>
              </li>
            </ul>

            <button
              type="button"
              className={`${buttonClass} mt-2 border-t border-white/10 pt-2`}
              onClick={() => {
                close();
                logout();
              }}
            >
              <LogoutIcon /> Sign out
            </button>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
