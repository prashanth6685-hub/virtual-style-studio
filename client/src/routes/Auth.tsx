import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { signup, login, guest, ApiError } from '../lib/api';
import { PageTitle } from '../components/ui';

/** /login and /signup. Google/Apple buttons are rendered DISABLED ("coming soon") — never fake OAuth. */
export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { setUser, toast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast('Enter a valid email address.', 'error');
      return;
    }
    if (password.length < 8) {
      toast('Password must be at least 8 characters.', 'error');
      return;
    }
    setBusy(true);
    try {
      const user = mode === 'login' ? await login(email, password) : await signup(email, password);
      setUser(user);
      toast(mode === 'login' ? 'Welcome back!' : 'Account created — welcome!', 'success');
      navigate('/start');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Authentication failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const continueAsGuest = async () => {
    setBusy(true);
    try {
      const user = await guest();
      setUser(user);
      toast('Continuing as guest.', 'success');
      navigate('/start');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Guest sign-in failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageTitle
        title={mode === 'login' ? 'Welcome back' : 'Create your account'}
        sub={mode === 'login' ? 'Log in to sync your avatars and looks.' : 'Free forever for Phase 1.'}
      />
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

        <div className="flex items-center gap-3 text-xs text-ink-400" aria-hidden="true">
          <span className="h-px flex-1 bg-ink-100" />
          or
          <span className="h-px flex-1 bg-ink-100" />
        </div>

        {/* Disabled social buttons — coming soon, never a fake OAuth flow */}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled title="Coming soon" className="btn-ghost !min-h-[48px] text-sm" aria-disabled="true">
            <span aria-hidden="true">G</span> Google
            <span className="text-[10px] font-medium opacity-60">soon</span>
          </button>
          <button type="button" disabled title="Coming soon" className="btn-ghost !min-h-[48px] text-sm" aria-disabled="true">
            <span aria-hidden="true">🍎</span> Apple
            <span className="text-[10px] font-medium opacity-60">soon</span>
          </button>
        </div>

        <button type="button" onClick={continueAsGuest} disabled={busy} className="btn-ghost w-full">
          Continue as guest
        </button>

        <p className="text-center text-sm text-ink-500">
          {mode === 'login' ? (
            <>New here? <Link to="/signup" className="font-bold text-brand-600 underline">Create an account</Link></>
          ) : (
            <>Have an account? <Link to="/login" className="font-bold text-brand-600 underline">Log in</Link></>
          )}
        </p>
      </form>
      <p className="mt-4 text-center text-xs text-ink-400">
        By continuing you agree to our <Link to="/privacy" className="underline">privacy promise</Link>.
      </p>
    </div>
  );
}
