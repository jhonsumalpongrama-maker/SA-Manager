import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

let env;

const admin = () => env.authenticatedContext('admin1', { email: 'admin@example.com' }).firestore();
const viewer = () => env.authenticatedContext('viewer1', { email: 'viewer@example.com' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const validAssignment = (over = {}) => ({
  studentId: 's_ann',
  studentName: 'Ann',
  nameLower: 'ann',
  areaId: 'a1',
  areaName: 'Library',
  areaLower: 'library',
  scheduleType: 'MWF',
  weekId: '2026-11-22',
  createdAt: serverTimestamp(),
  createdBy: 'admin@example.com',
  ...over,
});

const validRecord = (over = {}) => ({
  studentId: 's_ann',
  date: '2026-11-25',
  studentName: 'Ann',
  areaName: 'Library',
  scheduleType: 'MWF',
  status: 'P',
  timeIn: '15:02',
  note: null,
  markedBy: 'admin@example.com',
  confirmed: false,
  updatedAt: serverTimestamp(),
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sa-manager-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin1'), { role: 'admin', email: 'admin@example.com' });
    await setDoc(doc(db, 'users/viewer1'), { role: 'viewer', email: 'viewer@example.com' });
    await setDoc(doc(db, 'areas/a1'), { name: 'Library', scheduleType: 'MWF', order: 0, active: true });
  });
});

describe('authentication and roles', () => {
  it('blocks unauthenticated reads', async () => {
    await assertFails(getDoc(doc(anon(), 'areas/a1')));
  });

  it('lets any signed-in user read', async () => {
    await assertSucceeds(getDoc(doc(viewer(), 'areas/a1')));
  });

  it('blocks viewer writes everywhere', async () => {
    const db = viewer();
    await assertFails(setDoc(doc(db, 'areas/a2'), { name: 'X', scheduleType: 'MWF', order: 1, active: true }));
    await assertFails(setDoc(doc(db, 'weeks/2026-11-22/assignments/x'), validAssignment()));
    await assertFails(setDoc(doc(db, 'attendance/2026-11-25/records/s_ann'), validRecord({ markedBy: 'viewer@example.com' })));
  });

  it('allows self-registration only as viewer', async () => {
    const db = env.authenticatedContext('new1', { email: 'new@example.com' }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/new1'), { role: 'viewer', email: 'new@example.com', createdAt: serverTimestamp() }));
    const db2 = env.authenticatedContext('new2', { email: 'n2@example.com' }).firestore();
    await assertFails(setDoc(doc(db2, 'users/new2'), { role: 'admin', email: 'n2@example.com', createdAt: serverTimestamp() }));
  });

  it('stops a viewer promoting themselves', async () => {
    await assertFails(updateDoc(doc(viewer(), 'users/viewer1'), { role: 'admin' }));
  });
});

describe('field validation', () => {
  it('accepts a valid area and rejects a bad schedule type', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'areas/a2'), { name: 'CISO', scheduleType: 'MWF', order: 1, active: true }));
    await assertFails(setDoc(doc(admin(), 'areas/a3'), { name: 'Bad', scheduleType: 'WEEKLY', order: 1, active: true }));
    await assertFails(setDoc(doc(admin(), 'areas/a4'), { name: '', scheduleType: 'MWF', order: 1, active: true }));
  });

  it('accepts a valid assignment', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'weeks/2026-11-22/assignments/s_ann__MWF'), validAssignment()));
  });

  it('rejects an assignment whose weekId does not match its path', async () => {
    await assertFails(setDoc(doc(admin(), 'weeks/2026-11-22/assignments/x'), validAssignment({ weekId: '2026-11-15' })));
  });

  it('rejects unknown fields and forged authorship', async () => {
    await assertFails(setDoc(doc(admin(), 'weeks/2026-11-22/assignments/x'), validAssignment({ extra: 1 })));
    await assertFails(setDoc(doc(admin(), 'weeks/2026-11-22/assignments/x'), validAssignment({ createdBy: 'someone@else.com' })));
  });

  it('lets an admin move a student to another area but not change who they are', async () => {
    const path = 'weeks/2026-11-22/assignments/s_ann__MWF';
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), path), { ...validAssignment(), createdAt: new Date() }),
    );
    await assertSucceeds(setDoc(doc(admin(), path), validAssignment({ areaId: 'a2', areaName: 'CISO', areaLower: 'ciso' })));
    await assertFails(setDoc(doc(admin(), path), validAssignment({ studentId: 's_other' })));
  });

  it('validates attendance records', async () => {
    const path = 'attendance/2026-11-25/records/s_ann';
    await assertSucceeds(setDoc(doc(admin(), path), validRecord()));
    await assertFails(setDoc(doc(admin(), path), validRecord({ status: 'X' })));
    await assertFails(setDoc(doc(admin(), path), validRecord({ timeIn: '3pm' })));
    await assertFails(setDoc(doc(admin(), path), validRecord({ date: '2026-11-24' })));
    await assertFails(setDoc(doc(admin(), path), validRecord({ updatedAt: new Date('2020-01-01') })));
  });
});

describe('confirmed attendance is locked', () => {
  const recPath = 'attendance/2026-11-25/records/s_ann';
  const dayPath = 'attendance/2026-11-25';

  async function confirmDay() {
    await assertSucceeds(setDoc(doc(admin(), recPath), validRecord({ confirmed: true })));
    await assertSucceeds(
      setDoc(doc(admin(), dayPath), {
        date: '2026-11-25',
        confirmed: true,
        confirmedAt: serverTimestamp(),
        confirmedBy: 'admin@example.com',
      }),
    );
  }

  it('blocks edits, new records and deletes once the day is confirmed', async () => {
    await confirmDay();
    await assertFails(setDoc(doc(admin(), recPath), validRecord({ status: 'A' })));
    await assertFails(setDoc(doc(admin(), 'attendance/2026-11-25/records/s_bob'), validRecord({ studentId: 's_bob', studentName: 'Bob' })));
    await assertFails(deleteDoc(doc(admin(), recPath)));
  });

  it('lets an admin unlock, after which edits work again', async () => {
    await confirmDay();
    await assertSucceeds(
      updateDoc(doc(admin(), recPath), { confirmed: false, markedBy: 'admin@example.com', updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      setDoc(doc(admin(), dayPath), {
        date: '2026-11-25',
        confirmed: false,
        confirmedAt: serverTimestamp(),
        confirmedBy: 'admin@example.com',
      }),
    );
    await assertSucceeds(setDoc(doc(admin(), recPath), validRecord({ status: 'L' })));
  });

  it('does not let unlock smuggle in a status change', async () => {
    await confirmDay();
    await assertFails(
      updateDoc(doc(admin(), recPath), { confirmed: false, status: 'A', markedBy: 'admin@example.com', updatedAt: serverTimestamp() }),
    );
  });

  it('never lets a viewer touch the lock', async () => {
    await assertFails(
      setDoc(doc(viewer(), dayPath), { date: '2026-11-25', confirmed: false, confirmedBy: 'viewer@example.com' }),
    );
  });
});
