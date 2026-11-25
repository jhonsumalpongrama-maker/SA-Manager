import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { DEFAULT_SETTINGS } from '../config/constants';
import { db } from './firebase';

const ref = () => doc(db, 'settings', 'app');

export function subscribeSettings(onData, onError) {
  return onSnapshot(
    ref(),
    (snap) => onData({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) }),
    onError,
  );
}

export function saveSettings(settings) {
  const clean = {
    timezone: settings.timezone || DEFAULT_SETTINGS.timezone,
    weekStartsOn: settings.weekStartsOn === 1 ? 1 : 0,
    schoolLogoUrl: (settings.schoolLogoUrl || '').trim(),
    orgLogoUrl: (settings.orgLogoUrl || '').trim(),
  };
  return setDoc(ref(), clean);
}
