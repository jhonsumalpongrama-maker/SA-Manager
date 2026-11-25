import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { commitInChunks } from './batch';
import { sanitizeLabel } from '../utils/sanitize';

const col = () => collection(db, 'areas');

export function subscribeAreas(onData, onError) {
  return onSnapshot(
    col(),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function addArea({ name, scheduleType, order }) {
  const clean = sanitizeLabel(name);
  if (!clean) throw new Error('Area name is required.');
  return addDoc(col(), { name: clean, scheduleType, order, active: true });
}

export function renameArea(id, name) {
  const clean = sanitizeLabel(name);
  if (!clean) throw new Error('Area name is required.');
  return updateDoc(doc(db, 'areas', id), { name: clean });
}

/** Rewrites `order` for a list of areas (already in the desired sequence) in one batch. */
export function reorderAreas(orderedAreas) {
  return commitInChunks(
    orderedAreas.map((a, i) => (batch) => batch.update(doc(db, 'areas', a.id), { order: i })),
  );
}

/** Soft delete keeps history readable; assignments keep their denormalised area name. */
export function deactivateArea(id) {
  return updateDoc(doc(db, 'areas', id), { active: false });
}

export function reactivateArea(id) {
  return updateDoc(doc(db, 'areas', id), { active: true });
}

export function hardDeleteArea(id) {
  return deleteDoc(doc(db, 'areas', id));
}
