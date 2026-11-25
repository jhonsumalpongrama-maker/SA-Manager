import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { SkeletonList } from './components/Feedback';
import LoginPage from './pages/LoginPage';
import WeeklyPage from './pages/WeeklyPage';
import { useBootstrap } from './hooks/useBootstrap';
import { isConfigured } from './services/firebase';
import { useAppStore, isAdminRole } from './store/useAppStore';

const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const AreasPage = lazy(() => import('./pages/AreasPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function SetupNeeded() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="glass-strong rounded-3xl p-6">
        <h1 className="font-script text-5xl">SA Manager</h1>
        <p className="mt-3 text-sm">Firebase is not configured yet.</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-white/80">
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code>.
          </li>
          <li>Paste your Firebase web app keys (or set VITE_USE_EMULATORS=true).</li>
          <li>Restart the dev server.</li>
        </ol>
        <p className="mt-3 text-xs text-white/60">See README.md for the full setup.</p>
      </div>
    </main>
  );
}

function RequireAdmin({ children }) {
  const role = useAppStore((s) => s.role);
  return isAdminRole(role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  useBootstrap();
  const user = useAppStore((s) => s.user);
  const ready = useAppStore((s) => s.sessionReady);

  if (!isConfigured) return <SetupNeeded />;
  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <SkeletonList rows={4} />
      </div>
    );
  }
  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<WeeklyPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route
          path="areas"
          element={
            <RequireAdmin>
              <AreasPage />
            </RequireAdmin>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAdmin>
              <SettingsPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
