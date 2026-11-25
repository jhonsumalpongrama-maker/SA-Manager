# SA Manager

Mobile-first installable PWA for assigning Student Assistants (SAs) to weekly cleaning areas and tracking daily attendance in real time.

**Stack:** React 18 + Vite, React Router, Tailwind, Framer Motion, Zustand, date-fns, Firebase (Auth + Firestore, offline persistence), jsPDF + autotable, react-window, vite-plugin-pwa, Vitest + React Testing Library + Firestore emulator rules tests.

> **Status:** written and checked for syntax / imports and the pure-logic unit tests (54 pass) in a sandbox without network access. The React component tests, the Firestore rules tests and the app itself have **not** been executed there, because `npm install` and the Firebase emulator were unavailable. Run the steps below once on your machine; if anything fails, the error will point at a specific file.

## 1. Setup

```bash
cd backend  && npm install      # rules, emulators, seed script, rules tests
cd ../frontend && npm install   # the React app
cp .env.example .env.local      # fill in your Firebase web app keys
```

### Firebase project

1. Create a project at https://console.firebase.google.com.
2. **Build > Authentication > Sign-in method:** enable *Email/Password*.
3. **Build > Firestore Database:** create a database (production mode).
4. **Project settings > Your apps > Web:** register an app and copy the config values into `.env.local`.
5. Deploy rules and indexes:
   ```bash
   cd backend
   npx firebase login
   npx firebase use --add          # pick your project (or copy .firebaserc.example to .firebaserc)
   npm run deploy:rules
   ```
   Indexes take a few minutes to build; history search and the attendance-rate panel need them.
6. Seed default areas + settings and create the first admin (needs a service account key: Project settings > Service accounts > Generate key; save it **outside the repo** and point `GOOGLE_APPLICATION_CREDENTIALS` at it):
   ```bash
   cd backend
   GOOGLE_APPLICATION_CREDENTIALS=/path/key.json \
   npm run seed -- --project <project-id> --admin-email you@school.edu --admin-password 'choose-a-strong-one'
   ```
   The seed is idempotent. New sign-ups from the login screen are **viewers** (read-only); promote them under *Settings & Users*.

## 2. Run

```bash
cd frontend
npm run dev                     # http://localhost:5173
```

### Local emulator (no cloud project needed)

```bash
# terminal 1 (in backend/)
npm run emulators               # Auth :9099, Firestore :8080, UI :4000
# terminal 2 (in backend/)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  npm run seed -- --project demo-sa-manager --admin-email admin@example.com --admin-password Secret123
# terminal 3 (in frontend/; set VITE_USE_EMULATORS=true in .env.local first)
npm run dev
```

## 3. Tests

```bash
cd frontend && npm test && npm run lint     # unit + component tests (Vitest, jsdom)
cd backend  && npm test                     # Firestore security rules against the emulator (needs Java)
```

| Area | Where |
| --- | --- |
| shuffle (Fisher-Yates + no-repeat pass), auto-assign, duplicate planning, week/month maths, sanitising, attendance shift/summary/rates, history expansion, search grouping, print rows | `frontend/src/utils/*.test.js`, `frontend/src/features/print/rows.test.js` |
| Modal focus trap / Esc, accordion ARIA, chips, add-student form | `frontend/src/components/components.test.jsx`, `frontend/src/features/students/AddStudentModal.test.jsx` |
| Role enforcement, field validation, confirmed-attendance lock and unlock | `backend/tests/rules/firestore.rules.test.js` |

## 4. Build and deploy (Firebase Hosting)

```bash
cd frontend && npm run build
cd ../backend && npx firebase deploy --only hosting     # serves ../frontend/dist
```

The app uses hash routing, so deep links work on any static host. To host under a sub-path (e.g. GitHub Pages) set `base` in `frontend/vite.config.js` and the PWA `start_url`/`scope` to match.

## 5. How it maps to the requirements

| Feature | Notes |
| --- | --- |
| Weekly screen (3.1) | Accordions for MWF / Everyday / Monthly Cleaners, chips, live search (250 ms debounce) that filters rows and auto-expands matches. Areas are admin-editable (*Manage Areas*), seeded with your defaults. |
| Add student (3.2) | Validates (required, trimmed, no duplicate in the same schedule + week), creates the student if new, auto-assigns to a random least-loaded area, shows the chip at once (Firestore local cache) and syncs. Chip "x" removes with an **Undo** snackbar. |
| Shuffle (3.3) | Even spread, avoids last week's area when possible, then the "Shuffle Complete" dialog. |
| Clear week (3.4) | Only deletes that week's assignments; attendance is untouched. |
| Duplicate last week (3.5) | "No Records Found" dialog, or merge / replace when the week already has assignments. |
| Drawer, Calendar, Print, History, Attendance, App Info (3.6-3.11) | As specified. App Info reads the version from `package.json`. |
| Attendance live updates | Firestore `onSnapshot` with a "Live" indicator and last-updated time. Writes carry a server `updatedAt` (last-write-wins). |
| Confirm / lock | A day document is the lock. Rules block any record write on a confirmed day; only an admin can unlock. |
| Roles | Admin edits everything; viewer is read-only. Enforced in the UI **and** in `firestore.rules`. |
| Offline | Persistent Firestore cache; the header badge shows Offline / Syncing / Synced. |

## 6. Assumptions and design choices

- **Shift logic:** MWF students work Mon/Wed/Fri; Everyday students every day (all 7); Monthly Cleaners work the weekday matching their area name (area "Wednesday" = Wednesdays). Keep those area names if you rely on this.
- **Week id** = ISO date of the week's first day, computed in the configured timezone (default `Asia/Manila`, weeks start Sunday; both under *Settings*).
- **Assignment ids** are `studentId__SCHEDULE`, and student ids derive from the normalised name, so two admins adding the same student at once converge instead of creating duplicates.
- **History** is derived from weekly assignments expanded to the days each schedule works (up to today). Browsing pages week by week; search runs indexed prefix queries across all weeks plus substring matching on whatever is already loaded (Firestore has no substring search).
- **Attendance rate** = (Present + Late) / days marked, over the last 30 days. Unmarked days are not counted.
- **Pressing an active P/L/A button clears the mark.** A student marked but not on the day's shift is flagged "Unscheduled".
- **Self-registration** creates viewers only. The first admin comes from the seed script.
- Logos are configured as image links (no file storage is used); the image host must allow cross-origin loading for them to appear in the PDF.

## 7. Edge cases handled

Fewer students than areas (one per area, extra areas empty); more students than areas (even spread); student removed mid-week (past attendance keeps its denormalised names; future shifts drop them); week / month / year boundaries (UTC date arithmetic on `yyyy-MM-dd` keys, tested); two admins editing at once (deterministic ids, server timestamps, rules-level lock); attendance for an unassigned student (allowed, flagged); timezone (single conversion point); shuffling an empty schedule (friendly dialog); area deleted while students are in it (shown under "In removed areas"); name casing and duplicates (normalised, case-insensitive).

## 8. Folder structure

```
sa-manager/
├─ frontend/                 React + Vite PWA
│  ├─ src/
│  │  ├─ components/   Modal, Accordion, Drawer, Dialogs, Feedback (toast, skeleton, sync badge), TopBar, AppShell, Icons
│  │  ├─ config/       constants (schedules, default areas, settings)
│  │  ├─ features/     assignments/ attendance/ history/ print/ students/
│  │  ├─ hooks/        useBootstrap useWeek useWeekActions useAttendanceDay useHistory ...
│  │  ├─ pages/        Weekly Calendar History Attendance Areas Settings Login
│  │  ├─ services/     Firebase repositories (the only code that touches Firebase)
│  │  ├─ store/        Zustand store
│  │  └─ utils/        pure, unit-tested logic
│  ├─ public/  index.html  vite.config.js  tailwind.config.js  .env.example
│  └─ package.json
└─ backend/                  Firebase backend
   ├─ firestore.rules        role checks, field validation, confirmed-attendance lock
   ├─ firestore.indexes.json
   ├─ firebase.json          emulators + hosting (serves ../frontend/dist)
   ├─ scripts/seed.js        default areas, settings, first admin (defaults.js mirrors the frontend constants)
   ├─ tests/rules/           security-rules tests
   └─ package.json
```

The frontend's UI components never call Firebase directly; everything goes through hooks and `frontend/src/services/*`. To move to Supabase later, re-implement those repository files with the same function signatures.

## 9. Future improvements

CSV / Excel export of attendance and history, push notifications for unmarked shifts, QR-code check-in, analytics (trends, chronic lateness), per-student pages, bulk import of student lists, Supabase repository implementation, email invites for admins.
