import { useState } from 'react';
import { login, register, resetPassword } from '../services/authRepo';

const MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found for that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
    } catch (err) {
      setError(MESSAGES[err.code] || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const forgot = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) return setError('Enter your email first, then tap “Forgot password”.');
    try {
      await resetPassword(email);
      setInfo('If that account exists, a reset link has been sent.');
    } catch (err) {
      setError(MESSAGES[err.code] || 'Could not send the reset email.');
    }
    return undefined;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center p-6">
      <h1 className="text-center font-script text-6xl">SA Manager</h1>
      <p className="mb-6 mt-1 text-center text-sm text-white/70">Manage your student assistant schedules with a glassmorphic touch.</p>
      <form onSubmit={submit} className="glass-strong flex flex-col gap-4 rounded-3xl p-6" noValidate>
        <h2 className="text-lg font-semibold">{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-white/70">
            Email
          </label>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-white/70">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="text-sm text-brand-300">
            {info}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
        <div className="flex justify-between text-xs">
          <button type="button" className="text-brand-300 hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Create an account' : 'I already have an account'}
          </button>
          {mode === 'login' && (
            <button type="button" className="text-white/70 hover:underline" onClick={forgot}>
              Forgot password?
            </button>
          )}
        </div>
        {mode === 'register' && <p className="text-[11px] text-white/50">New accounts are read-only viewers until an admin promotes them.</p>}
      </form>
    </main>
  );
}
