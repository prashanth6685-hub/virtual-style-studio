import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import {
  guest as apiGuest,
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

/** /profile — measurements, style prefs, data controls. No sign-in, ever. */
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

  const doDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === 'photos') {
        await deleteMyPhotos();
        toast('Your photos were deleted.', 'success');
      } else {
        await deleteMyData();
        // Fresh anonymous identity so the app keeps working without a sign-in.
        try {
          setUser(await apiGuest());
        } catch {
          setUser(null);
        }
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
        <PageTitle title="Profile" sub="Your style space." />
        <div className="card text-center">
          <p className="text-sm text-ink-500">
            No account needed — your avatars and looks are saved on this device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle title="Profile" sub="Your measurements and preferences." />

      {/* No sign-in */}
      <section className="card" aria-labelledby="nosignin-h">
        <h2 id="nosignin-h" className="mb-1 font-bold text-ink-900">No account needed</h2>
        <p className="text-sm text-ink-500">
          Everything here works without signing in, ever. Your avatars and looks are saved
          on this device.
        </p>
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
            : 'This permanently deletes everything — avatars, looks, photos, measurements and preferences. This cannot be undone.'}
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
