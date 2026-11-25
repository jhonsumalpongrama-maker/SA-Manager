/**
 * Seeds default areas + settings and (optionally) creates the first admin account.
 *
 *   # run from backend/ - against the emulators (npm run emulators in another terminal)
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *     node scripts/seed.js --project demo-sa-manager --admin-email admin@example.com --admin-password Secret123
 *
 *   # against a real project (service account key in GOOGLE_APPLICATION_CREDENTIALS)
 *   node scripts/seed.js --project <your-project-id> --admin-email you@school.edu --admin-password '...'
 *
 * Safe to re-run: areas use deterministic ids and are only created when missing, so renamed or
 * reordered areas are never overwritten.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_AREAS, DEFAULT_SETTINGS } from './defaults.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const projectId = arg('project') || process.env.GCLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('Missing project id. Pass --project <id> or set GCLOUD_PROJECT.');
  process.exit(1);
}

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
initializeApp(usingEmulator ? { projectId } : { projectId, credential: applicationDefault() });
const db = getFirestore();
const auth = getAuth();

async function seedAreas() {
  let created = 0;
  for (const area of DEFAULT_AREAS) {
    const ref = db.collection('areas').doc(`${area.scheduleType.toLowerCase()}-${slug(area.name)}`);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set(area);
      created += 1;
    }
  }
  console.log(`Areas: ${created} created, ${DEFAULT_AREAS.length - created} already present.`);
}

async function seedSettings() {
  const ref = db.collection('settings').doc('app');
  if (!(await ref.get()).exists) {
    await ref.set(DEFAULT_SETTINGS);
    console.log('Settings: created defaults (Asia/Manila, weeks start on Sunday).');
  } else {
    console.log('Settings: already present.');
  }
}

async function seedAdmin(email, password) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Admin: account ${email} already exists.`);
  } catch {
    if (!password) {
      console.error('Admin account does not exist yet; pass --admin-password to create it.');
      process.exit(1);
    }
    user = await auth.createUser({ email, password, emailVerified: true });
    console.log(`Admin: created account ${email}.`);
  }
  await db.collection('users').doc(user.uid).set({ role: 'admin', email, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Admin: ${email} now has the admin role.`);
}

await seedSettings();
await seedAreas();
const adminEmail = arg('admin-email');
if (adminEmail) await seedAdmin(adminEmail, arg('admin-password'));
console.log('Done.');
