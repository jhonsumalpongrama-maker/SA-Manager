import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../config/constants';

let toastId = 0;

/**
 * Global state. Server data (areas, students, settings, session) lives here so every screen shares
 * the same Firestore listeners; per-screen data stays in hooks.
 */
export const useAppStore = create((set, get) => ({
  // session
  user: null,
  role: null,
  sessionReady: false,
  setSession: ({ user, role, ready }) => set({ user, role, sessionReady: ready }),

  // shared server data
  settings: DEFAULT_SETTINGS,
  areas: [],
  areasLoaded: false,
  students: [],
  setSettings: (settings) => set({ settings }),
  setAreas: (areas) => set({ areas, areasLoaded: true }),
  setStudents: (students) => set({ students }),

  // ui
  selectedDate: null, // null => "today" in the configured timezone
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  searchTerm: '',
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  focusSearchTick: 0,
  requestSearchFocus: () => set((s) => ({ focusSearchTick: s.focusSearchTick + 1 })),
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  activeDialog: null, // 'print' | 'about' | null (opened from the drawer, rendered by AppShell)
  setActiveDialog: (activeDialog) => set({ activeDialog }),

  // sync badge
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pendingWrites: false,
  setOnline: (online) => set({ online }),
  setPendingWrites: (pendingWrites) => set({ pendingWrites }),

  // toasts / snackbars (an action turns a toast into an "Undo" snackbar)
  toasts: [],
  toast: (message, opts = {}) => {
    toastId += 1;
    const id = toastId;
    const t = { id, message, type: opts.type || 'info', action: opts.action || null };
    set((s) => ({ toasts: [...s.toasts.slice(-2), t] }));
    const ms = opts.duration ?? (opts.action ? 6000 : 3500);
    setTimeout(() => get().dismissToast(id), ms);
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const isAdminRole = (role) => role === 'admin';
