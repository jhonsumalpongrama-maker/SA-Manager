import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { commitInChunks } from './batch';
import { sanitizeText } from '../utils/sanitize';

const dayDoc = (dateKey) => doc(db, 'attendance', dateKey);
const recordsCol = (dateKey) => collection(db, 'attendance', dateKey, 'records');
const recordDoc = (dateKey, studentId) => doc(db, 'attendance', dateKey, 'records', studentId);

/**
 * Real-time listener for one day. Calls back with
 * { records, day: { confirmed, ... } | null, meta: { fromCache, hasPendingWrites }, lastUpdated }.
 * `lastUpdated` is the newest server `updatedAt` seen, shown next to the "live" indicator.
 */
export function subscribeDay(dateKey, onData, onError) {
  let records = [];
  let day = null;
  let meta = { fromCache: true, hasPendingWrites: false };

  const emit = () => {
    const times = records.map((r) => (r.updatedAt && r.updatedAt.toMillis ? r.updatedAt.toMillis() : 0));
    onData({ records, day, meta, lastUpdated: times.length ? Math.max(...times) || null : null });
  };

  const unsubRecords = onSnapshot(
    recordsCol(dateKey),
    { includeMetadataChanges: true },
    (snap) => {
      records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      meta = { fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites };
      emit();
    },
    onError,
  );
  const unsubDay = onSnapshot(
    dayDoc(dateKey),
    (snap) => {
      day = snap.exists() ? snap.data() : null;
      emit();
    },
    onError,
  );
  return () => {
    unsubRecords();
    unsubDay();
  };
}

/**
 * Marks one student. Last-write-wins: `updatedAt` is a server timestamp, so the most recent write
 * from any device is what every client ends up showing.
 */
export function markStatus({ dateKey, row, status, markedBy, timeIn = null, note = null }) {
  return setDoc(recordDoc(dateKey, row.studentId), {
    studentId: row.studentId,
    date: dateKey,
    studentName: row.studentName,
    areaName: row.areaName || '—',
    scheduleType: row.scheduleType,
    status,
    timeIn: timeIn || null,
    note: note ? sanitizeText(note) : null,
    markedBy,
    confirmed: false,
    updatedAt: serverTimestamp(),
  });
}

/** Clearing a mark removes the record so the student counts as "not yet marked" again. */
export function clearStatus(dateKey, studentId) {
  return deleteDoc(recordDoc(dateKey, studentId));
}

/**
 * Locks the day. Optionally records everyone still unmarked as Absent first.
 * rows: roster rows ({ studentId, studentName, areaName, scheduleType, record }).
 */
export function confirmDay({ dateKey, rows, markedBy, markRemainingAbsent = false }) {
  const ops = [];
  rows.forEach((row) => {
    const rec = row.record;
    if (!rec && !markRemainingAbsent) return;
    ops.push((batch) =>
      batch.set(recordDoc(dateKey, row.studentId), {
        studentId: row.studentId,
        date: dateKey,
        studentName: row.studentName,
        areaName: row.areaName || '—',
        scheduleType: row.scheduleType,
        status: rec ? rec.status : 'A',
        timeIn: rec ? rec.timeIn || null : null,
        note: rec ? rec.note || null : null,
        markedBy,
        confirmed: true,
        updatedAt: serverTimestamp(),
      }),
    );
  });
  // The day document goes last: security rules read its pre-batch state, so record writes in the
  // same batch are still allowed, and it is what blocks every later write.
  ops.push((batch) =>
    batch.set(dayDoc(dateKey), {
      date: dateKey,
      confirmed: true,
      confirmedAt: serverTimestamp(),
      confirmedBy: markedBy,
    }),
  );
  return commitInChunks(ops);
}

/** Admin-only: reopens a confirmed day for editing. */
export function unlockDay({ dateKey, records, markedBy }) {
  const ops = records.map((rec) => (batch) =>
    batch.set(
      recordDoc(dateKey, rec.id || rec.studentId),
      { confirmed: false, markedBy, updatedAt: serverTimestamp() },
      { merge: true },
    ),
  );
  ops.push((batch) =>
    batch.set(dayDoc(dateKey), { date: dateKey, confirmed: false, confirmedAt: serverTimestamp(), confirmedBy: markedBy }),
  );
  return commitInChunks(ops);
}

/** One-off fetch of all records in [startKey, endKey] for the attendance-rate dashboard. */
export async function fetchRange(startKey, endKey) {
  const q = query(collectionGroup(db, 'records'), where('date', '>=', startKey), where('date', '<=', endKey));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
