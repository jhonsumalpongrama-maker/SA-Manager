import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const useEmulators = env.VITE_USE_EMULATORS === 'true';

/** True when .env.local has been filled in (or the emulators are used with a demo project). */
export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) || useEmulators;

const app = initializeApp(
  isConfigured
    ? { ...firebaseConfig, projectId: firebaseConfig.projectId || 'demo-sa-manager', apiKey: firebaseConfig.apiKey || 'demo' }
    : { apiKey: 'missing', projectId: 'missing', appId: 'missing' },
);

export const auth = getAuth(app);

// Offline persistence: the app opens offline and queued writes replay when the connection returns.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
