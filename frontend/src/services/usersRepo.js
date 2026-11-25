import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/** Admin-only: lists every account with its role. */
export function subscribeUsers(onData, onError) {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.email || '').localeCompare(b.email || ''))),
    onError,
  );
}

export function setUserRole(uid, role) {
  if (!['admin', 'viewer'].includes(role)) throw new Error('Invalid role');
  return updateDoc(doc(db, 'users', uid), { role });
}
