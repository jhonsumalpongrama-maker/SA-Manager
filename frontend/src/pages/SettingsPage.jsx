import { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { SkeletonList } from '../components/Feedback';
import { useAppStore } from '../store/useAppStore';
import { saveSettings } from '../services/settingsRepo';
import { setUserRole, subscribeUsers } from '../services/usersRepo';

const FALLBACK_ZONES = ['Asia/Manila', 'Asia/Taipei', 'Asia/Singapore', 'Asia/Tokyo', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London'];

function validZone(zone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const validUrl = (u) => !u || /^https?:\/\//i.test(u) || u.startsWith('/');

function UsersPanel() {
  const me = useAppStore((s) => s.user);
  const toast = useAppStore((s) => s.toast);
  const [state, setState] = useState({ loading: true, users: [], error: false });

  useEffect(
    () =>
      subscribeUsers(
        (users) => setState({ loading: false, users, error: false }),
        () => setState({ loading: false, users: [], error: true }),
      ),
    [],
  );

  return (
    <section className="glass rounded-2xl p-4" aria-labelledby="users-h">
      <h2 id="users-h" className="text-base font-semibold">
        Users
      </h2>
      <p className="mb-3 text-xs text-white/60">New sign-ups start as viewers (read-only). Promote trusted accounts to admin.</p>
      {state.loading ? (
        <SkeletonList rows={2} />
      ) : state.error ? (
        <p className="text-sm text-red-300">Could not load users.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-2 pl-3">
              <span className="truncate text-sm">{u.email || u.id}</span>
              <label className="sr-only" htmlFor={`role-${u.id}`}>
                Role for {u.email}
              </label>
              <select
                id={`role-${u.id}`}
                className="input !w-auto"
                value={u.role}
                disabled={me && u.id === me.uid}
                title={me && u.id === me.uid ? 'You cannot change your own role' : undefined}
                onChange={(e) => setUserRole(u.id, e.target.value).catch(() => toast('Could not change the role.', { type: 'error' }))}
              >
                <option value="viewer" className="bg-[#0c2815]">
                  Viewer
                </option>
                <option value="admin" className="bg-[#0c2815]">
                  Admin
                </option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const toast = useAppStore((s) => s.toast);
  const [form, setForm] = useState(settings);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const zones = useMemo(() => {
    const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : FALLBACK_ZONES;
    return all.includes(form.timezone) ? all : [form.timezone, ...all];
  }, [form.timezone]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: key === 'weekStartsOn' ? Number(e.target.value) : e.target.value }));
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validZone(form.timezone)) return setError('That timezone is not valid.');
    if (!validUrl(form.schoolLogoUrl) || !validUrl(form.orgLogoUrl)) return setError('Logo links must start with https://');
    setSaving(true);
    saveSettings(form)
      .then(() => toast('Settings saved', { type: 'success' }))
      .catch(() => toast('Could not save settings.', { type: 'error' }))
      .finally(() => setSaving(false));
    return undefined;
  };

  return (
    <>
      <TopBar title="Settings" />
      <main className="flex flex-col gap-4 p-4">
        <form onSubmit={submit} className="glass flex flex-col gap-4 rounded-2xl p-4" noValidate>
          <div>
            <label htmlFor="tz" className="mb-1 block text-xs text-white/70">
              Timezone
            </label>
            <select id="tz" className="input" value={form.timezone} onChange={set('timezone')}>
              {zones.map((z) => (
                <option key={z} value={z} className="bg-[#0c2815]">
                  {z}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-white/50">Decides what &quot;today&quot; is for the week view and attendance.</p>
          </div>
          <div>
            <label htmlFor="wso" className="mb-1 block text-xs text-white/70">
              Week starts on
            </label>
            <select id="wso" className="input" value={form.weekStartsOn} onChange={set('weekStartsOn')}>
              <option value={0} className="bg-[#0c2815]">
                Sunday
              </option>
              <option value={1} className="bg-[#0c2815]">
                Monday
              </option>
            </select>
            <p className="mt-1 text-[11px] text-white/50">Existing weeks keep their saved start date; changing this affects which week a date belongs to.</p>
          </div>
          <div>
            <label htmlFor="school-logo" className="mb-1 block text-xs text-white/70">
              School logo link
            </label>
            <input id="school-logo" className="input" placeholder="https://…/school-logo.png" value={form.schoolLogoUrl} onChange={set('schoolLogoUrl')} />
          </div>
          <div>
            <label htmlFor="org-logo" className="mb-1 block text-xs text-white/70">
              Organization logo link
            </label>
            <input id="org-logo" className="input" placeholder="https://…/org-logo.png" value={form.orgLogoUrl} onChange={set('orgLogoUrl')} />
            <p className="mt-1 text-[11px] text-white/50">Logos appear in the menu and on printed PDFs. The image host must allow cross-origin loading for the PDF.</p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
        <UsersPanel />
      </main>
    </>
  );
}
