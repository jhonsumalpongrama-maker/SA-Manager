import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribeSession } from '../services/authRepo';
import { subscribeSettings } from '../services/settingsRepo';
import { subscribeAreas } from '../services/areasRepo';
import { subscribeStudents } from '../services/studentsRepo';

/** Starts the app-wide listeners: auth/role first, then (when signed in) settings, areas, students. */
export function useBootstrap() {
  const user = useAppStore((s) => s.user);
  const setSession = useAppStore((s) => s.setSession);
  const setSettings = useAppStore((s) => s.setSettings);
  const setAreas = useAppStore((s) => s.setAreas);
  const setStudents = useAppStore((s) => s.setStudents);
  const setOnline = useAppStore((s) => s.setOnline);
  const toast = useAppStore((s) => s.toast);

  useEffect(() => subscribeSession(setSession), [setSession]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [setOnline]);

  const uid = user ? user.uid : null;
  useEffect(() => {
    if (!uid) return undefined;
    const onError = () => toast('Could not load data. Check your connection or permissions.', { type: 'error' });
    const unsubs = [
      subscribeSettings(setSettings, onError),
      subscribeAreas(setAreas, onError),
      subscribeStudents(setStudents, () => {}),
    ];
    return () => unsubs.forEach((u) => u());
  }, [uid, setSettings, setAreas, setStudents, toast]);
}
