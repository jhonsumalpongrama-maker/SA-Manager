import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Self-registration always produces a viewer; an admin promotes accounts afterwards. */
export async function register(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    role: 'viewer',
    email: cred.user.email,
    createdAt: serverTimestamp(),
  });
  return cred;
}

export function logout() {
  return signOut(auth);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

/**
 * Calls back with { user, role } whenever auth state or the user's role document changes.
 * role is "admin" | "viewer" | null (null while the role document does not exist yet).
 */
export function subscribeSession(callback) {
  let unsubRole = () => {};
  const unsubAuth = onAuthStateChanged(auth, (user) => {
    unsubRole();
    if (!user) {
      callback({ user: null, role: null, ready: true });
      return;
    }
    // A freshly created account may not have its role document yet; viewer is the safe default.
    const ref = doc(db, 'users', user.uid);
    unsubRole = onSnapshot(
      ref,
      (snap) => callback({ user, role: snap.exists() ? snap.data().role : 'viewer', ready: true }),
      () => callback({ user, role: 'viewer', ready: true }),
    );
  });
  return () => {
    unsubRole();
    unsubAuth();
  };
}
