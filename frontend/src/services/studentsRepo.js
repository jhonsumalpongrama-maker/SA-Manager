import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { nameKey, sanitizeName, studentIdFor } from '../utils/sanitize';

export function subscribeStudents(onData, onError) {
  return onSnapshot(
    collection(db, 'students'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/**
 * Returns the student for this name, creating it if it does not exist yet. The id is derived from
 * the normalised name, so concurrent calls from two admins converge on one document.
 * Resolves with { id, fullName, nameLower } and does not wait for the server when offline.
 */
export async function ensureStudent(rawName, knownStudents = []) {
  const fullName = sanitizeName(rawName);
  const nameLower = nameKey(fullName);
  const id = studentIdFor(fullName);

  const known = knownStudents.find((s) => s.id === id);
  if (known) return { id, fullName: known.fullName, nameLower };

  const ref = doc(db, 'students', id);
  let existing = null;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) existing = snap.data();
  } catch {
    /* offline with an empty cache: fall through and create */
  }
  if (existing) return { id, fullName: existing.fullName, nameLower };

  // Do not await: while offline the promise only settles on reconnect.
  setDoc(ref, { fullName, nameLower, active: true, createdAt: serverTimestamp() }).catch(() => {});
  return { id, fullName, nameLower };
}
