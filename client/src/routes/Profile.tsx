import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import {
  logout as apiLogout,
  getMeasurements,
  saveMeasurements,
  getStylePrefs,
  saveStylePrefs,
  deleteMyPhotos,
  deleteMyData,
  ApiError,
  type Measurement,
} from '../lib/api';
import { PageTitle, Modal } from '../components/ui';

const MEASURE_FIELDS: { key: keyof Measurement; label: string }[] = [
  { key: 'heightCm', label: 'Height (cm)' },
  { key: 'chestCm', label: 'Chest (cm)' },
  { key: 'waistCm', label: 'Waist (cm)' },
  { key: 'hipCm', label: 'Hip (cm)' },
  { key: 'shoulderCm', label: 'Shoulder (cm)' },
  { key: 'inseamCm', label: 'Inseam (cm)' },
];

/** /profile — account, measurements, style prefs, data controls, logout. */
export default function Profile() {
  const { user, setUser, toast, authChecked } = useApp();
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<Measurement>({});
  const [prefs, setPrefs] = useState({ colors: '', styles: '', notes: '' });
  const [savingM, setSavingM] = useState(false);
  const [savingP, setSavingP] = useState(false);
  const [confirm, setConfirm] = useState<'photos' | 'data' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authChecked || !user) return;
    getMeasurements().then(setMeasurements).catch(() => {});
    getStylePrefs()
      .then((p) =>
        setPrefs({
          colors: String(p.colors ?? ''),
          styles: String(p.styles ?? ''),
          notes: String(p.notes ?? ''),
        }),
      )
      .catch(() => {});
  }, [authChecked, user]);

  const saveM = async () => {
    setSavingM(true);
    try {
      await saveMeasurements(measurements);
      toast('Measurements saved.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed.', 'error');
    } finally {
      setSavingM(false);
    }
  };

  const saveP = async () => {
    setSavingP(true);
    try {
      await saveStylePrefs(prefs);
      toast('Style preferences saved.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed.', 'error');
    } finally {
      setSavingP(false);
    }
  };

  const doLogout = async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    setUser(null);
    toast('Logged out.', 'success');
    navigate('/');
  };

  const doDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === 'photos') {
        await deleteMyPhotos();
        toast('Your photos were deleted.', 'success');
      } else {
        await deleteMyData();
        setUser(null);
        toast('Your data was deleted.', 'success');
        navigate('/');
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Delete failed.', 'error');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  if (authChecked && !user) {
    return (
      <div className="mx-auto max-w-xl">
        <PageTitle title="Profile" sub="You're browsing as a guest." />
        <div className="card text-center">
          <p className="text-sm text-ink-500">
            Log in or create an account to save avatars, looks and measurements across devices.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/login" className="btn-primary flex-1">Log in</Link>
            <Link to="/signup" className="btn-ghost flex-1">Sign up</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle title="Profile" sub="Your account and preferences." />

      {/* Account */}
      <section className="card" aria-labelledby="account-h">
        <h2 id="account-h" className="mb-2 font-bold text-ink-900">Account</h2>
        {user ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">Email</dt><dd className="font-semibold">{user.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Account type</dt><dd className="font-semibold">{user.isGuest ? 'Guest' : 'Member'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Member since</dt><dd className="font-semibold">{new Date(user.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        ) : (
          <SkeletonLine />
        )}
        <button onClick={doLogout} className="btn-ghost mt-4 w-full">Log out</button>
      </section>

      {/* Measurements */}
      <section className="card" aria-labelledby="measure-h">
        <h2 id="measure-h" className="mb-1 font-bold text-ink-900">Measurements</h2>
        <p className="mb-3 text-xs text-ink-400">Optional — helps future fit recommendations.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MEASURE_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={`m-${f.key}`}>{f.label}</label>
              <input
                id={`m-${f.key}`}
                type="number"
                min={0}
                max={300}
                inputMode="decimal"
                className="field"
                value={measurements[f.key] ?? ''}
                onChange={(e) =>
                  setMeasurements((m) => ({
                    ...m,
                    [f.key]: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
        <button onClick={saveM} disabled={savingM} className="btn-primary mt-4 w-full sm:w-auto">
          {savingM ? 'Saving…' : 'Save measurements'}
        </button>
      </section>

      {/* Style prefs */}
      <section className="card" aria-labelledby="prefs-h">
        <h2 id="prefs-h" className="mb-3 font-bold text-ink-900">Style preferences</h2>
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="pref-colors">Favorite colors</label>
            <input id="pref-colors" className="field" value={prefs.colors} onChange={(e) => setPrefs((p) => ({ ...p, colors: e.target.value }))} placeholder="e.g. navy, earth tones" maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="pref-styles">Favorite styles</label>
            <input id="pref-styles" className="field" value={prefs.styles} onChange={(e) => setPrefs((p) => ({ ...p, styles: e.target.value }))} placeholder="e.g. minimalist, streetwear" maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="pref-notes">Notes</label>
            <textarea id="pref-notes" className="field min-h-[88px]" value={prefs.notes} onChange={(e) => setPrefs((p) => ({ ...p, notes: e.target.value }))} placeholder="Anything a stylist should know…" maxLength={500} />
          </div>
        </div>
        <button onClick={saveP} disabled={savingP} className="btn-primary mt-4 w-full sm:w-auto">
          {savingP ? 'Saving…' : 'Save preferences'}
        </button>
      </section>

      {/* Danger zone */}
      <section className="card border-red-200" aria-labelledby="danger-h">
        <h2 id="danger-h" className="mb-1 font-bold text-red-800">Your data</h2>
        <p className="mb-3 text-sm text-ink-500">
          <Link to="/privacy" className="font-bold text-brand-600 underline">How we handle your data</Link>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button onClick={() => setConfirm('photos')} className="btn min-h-[44px] bg-red-50 font-bold text-red-700 ring-1 ring-red-200">
            🗑️ Delete my photos
          </button>
          <button onClick={() => setConfirm('data')} className="btn min-h-[44px] bg-red-700 font-bold text-white">
            ⚠️ Delete my data
          </button>
        </div>
      </section>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'photos' ? 'Delete my photos?' : 'Delete my data?'}
      >
        <p className="text-sm text-ink-600">
          {confirm === 'photos'
            ? 'This permanently deletes every photo you uploaded. Avatars and saved looks that reference them will lose their images.'
            : 'This permanently deletes your account, photos, avatars, looks, measurements and preferences. This cannot be undone.'}
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setConfirm(null)} className="btn-ghost flex-1">Cancel</button>
          <button onClick={doDelete} disabled={busy} className="btn flex-1 bg-red-700 font-bold text-white">
            {busy ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SkeletonLine() {
  return <div className="skeleton h-5 w-2/3" />;
}
