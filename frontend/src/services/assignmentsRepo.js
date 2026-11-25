import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { commitInChunks } from './batch';

const assignmentsCol = (weekId) => collection(db, 'weeks', weekId, 'assignments');
const weekDoc = (weekId) => doc(db, 'weeks', weekId);

/** One assignment per student per schedule per week => deterministic id prevents duplicates. */
export const assignmentId = (studentId, scheduleType) => `${studentId}__${scheduleType}`;

function toAssignmentData({ weekId, student, area, scheduleType, createdBy }) {
  return {
    studentId: student.id,
    studentName: student.fullName,
    nameLower: student.nameLower || student.fullName.toLowerCase(),
    areaId: area.id,
    areaName: area.name,
    areaLower: area.name.toLowerCase(),
    scheduleType,
    weekId,
    createdAt: serverTimestamp(),
    createdBy,
  };
}

const touchWeek = (weekId) => setDoc(weekDoc(weekId), { weekId, updatedAt: serverTimestamp() }, { merge: true });

/** Live listener for one week. `meta` exposes cache/pending state for the sync badge. */
export function subscribeWeek(weekId, onData, onError) {
  return onSnapshot(
    assignmentsCol(weekId),
    { includeMetadataChanges: true },
    (snap) =>
      onData(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        { fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites },
      ),
    onError,
  );
}

export async function fetchWeek(weekId) {
  const snap = await getDocs(assignmentsCol(weekId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Adds a student to an area. The local cache updates immediately (optimistic UI). */
export function addAssignment({ weekId, student, area, scheduleType, createdBy }) {
  const id = assignmentId(student.id, scheduleType);
  const batch = writeBatch(db);
  batch.set(weekDoc(weekId), { weekId, updatedAt: serverTimestamp() }, { merge: true });
  batch.set(doc(assignmentsCol(weekId), id), toAssignmentData({ weekId, student, area, scheduleType, createdBy }));
  return batch.commit().then(() => id);
}

/** Removes one chip. The local snapshot updates at once; the delete syncs when online. */
export function removeAssignment(weekId, id) {
  return deleteDoc(doc(assignmentsCol(weekId), id));
}

/** Undo for a removal: writes the removed assignment back with its original fields. */
export function restoreAssignment(weekId, assignment, createdBy) {
  const { id, ...rest } = assignment;
  return setDoc(doc(assignmentsCol(weekId), id), {
    studentId: rest.studentId,
    studentName: rest.studentName,
    nameLower: rest.nameLower || rest.studentName.toLowerCase(),
    areaId: rest.areaId,
    areaName: rest.areaName,
    areaLower: (rest.areaLower || rest.areaName.toLowerCase()),
    scheduleType: rest.scheduleType,
    weekId,
    createdAt: serverTimestamp(),
    createdBy,
  });
}

/**
 * Applies a shuffle result: `moves` is [{ id, area }]. Only the area fields change, so a student's
 * identity and schedule stay fixed (also enforced by the security rules).
 */
export function applyShuffle(weekId, moves, createdBy, existing) {
  const byId = new Map(existing.map((a) => [a.id, a]));
  const ops = moves.map(({ id, area }) => (batch) => {
    const a = byId.get(id);
    batch.set(doc(assignmentsCol(weekId), id), {
      studentId: a.studentId,
      studentName: a.studentName,
      nameLower: a.nameLower || a.studentName.toLowerCase(),
      areaId: area.id,
      areaName: area.name,
      areaLower: area.name.toLowerCase(),
      scheduleType: a.scheduleType,
      weekId,
      createdAt: serverTimestamp(),
      createdBy,
    });
  });
  return commitInChunks(ops);
}

/**
 * Deletes every assignment of one week. Attendance lives elsewhere and is untouched.
 * Resolves with { count, committed } as soon as the deletes are queued; `committed` settles when
 * the server acknowledges them.
 */
export async function clearWeek(weekId) {
  let docs;
  try {
    docs = (await getDocs(assignmentsCol(weekId))).docs;
  } catch {
    docs = [];
  }
  const committed = commitInChunks(docs.map((d) => (batch) => batch.delete(d.ref)));
  return { count: docs.length, committed };
}

/** Executes a plan produced by utils/duplicate.planDuplicate. */
export function applyDuplicatePlan(weekId, plan, createdBy) {
  const ops = [(batch) => batch.set(weekDoc(weekId), { weekId, updatedAt: serverTimestamp() }, { merge: true })];
  plan.toDeleteIds.forEach((id) => ops.push((batch) => batch.delete(doc(assignmentsCol(weekId), id))));
  plan.toCreate.forEach((c) =>
    ops.push((batch) =>
      batch.set(
        doc(assignmentsCol(weekId), assignmentId(c.studentId, c.scheduleType)),
        toAssignmentData({
          weekId,
          student: { id: c.studentId, fullName: c.studentName },
          area: { id: c.areaId, name: c.areaName },
          scheduleType: c.scheduleType,
          createdBy,
        }),
      ),
    ),
  );
  return commitInChunks(ops);
}

export { touchWeek };
