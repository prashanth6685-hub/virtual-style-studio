import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GarmentRef, SuggestRequest } from '@vss/shared';
import { useApp } from '../state/AppContext';
import { suggestOutfit, ApiError, type SuggestResponse } from '../lib/api';
import { garmentDisplayName } from '../lib/catalog';
import { PageTitle, ProgressBar } from '../components/ui';

const OCCASIONS = ['Everyday', 'Work', 'Date night', 'Party', 'Wedding', 'Interview', 'Workout', 'Travel', 'Festival', 'Religious event'];
const WEATHERS = ['Hot', 'Warm', 'Mild', 'Cool', 'Cold', 'Rainy'];
const STYLES = ['Casual', 'Business Casual', 'Formal', 'Streetwear', 'Minimalist', 'Traditional', 'Athletic', 'Party'];
const BUDGETS: { id: SuggestRequest['budget']; label: string }[] = [
  { id: 'budget', label: 'Budget' },
  { id: 'mid', label: 'Mid-range' },
  { id: 'premium', label: 'Premium' },
];

/** /generator — "Create an Outfit for Me" → suggestion → try it. */
export default function Generator() {
  const { personType, replaceOutfit, toast } = useApp();
  const navigate = useNavigate();
  const [occasion, setOccasion] = useState('Everyday');
  const [weather, setWeather] = useState('Warm');
  const [style, setStyle] = useState('Casual');
  const [colorPref, setColorPref] = useState('');
  const [budget, setBudget] = useState<SuggestRequest['budget']>('mid');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);

  const generate = async () => {
    setLoading(true);
    setSuggestion(null);
    try {
      const s = await suggestOutfit({
        personType,
        occasion,
        weather,
        style,
        colorPref: colorPref || undefined,
        budget,
      });
      setSuggestion(s);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not generate an outfit.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tryLook = () => {
    if (!suggestion) return;
    replaceOutfit({ ...suggestion.outfit, accessories: suggestion.outfit.accessories ?? [] });
    toast('Suggestion loaded — opening the studio.', 'success');
    navigate('/studio');
  };

  const pieces: GarmentRef[] = suggestion
    ? ([
        suggestion.outfit.top, suggestion.outfit.bottom, suggestion.outfit.dress,
        suggestion.outfit.outerwear, suggestion.outfit.shoes,
      ].filter(Boolean) as GarmentRef[]).concat(suggestion.outfit.accessories ?? [])
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle
        title="Create an Outfit for Me"
        sub="Tell us about the moment — we'll put the look together."
      />
      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="occasion">Occasion</label>
            <select id="occasion" className="field" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="weather">Weather</label>
            <select id="weather" className="field" value={weather} onChange={(e) => setWeather(e.target.value)}>
              {WEATHERS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="style">Style</label>
            <select id="style" className="field" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="budget">Budget</label>
            <select id="budget" className="field" value={budget} onChange={(e) => setBudget(e.target.value as SuggestRequest['budget'])}>
              {BUDGETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="colorPref">Color preference <span className="font-normal text-ink-400">(optional)</span></label>
          <input
            id="colorPref"
            className="field"
            placeholder="e.g. blues and neutrals, festive reds…"
            value={colorPref}
            onChange={(e) => setColorPref(e.target.value)}
            maxLength={80}
          />
        </div>
        <button onClick={generate} disabled={loading} className="btn-accent w-full !min-h-[52px]">
          {loading ? 'Dreaming up your outfit…' : '🪄 Generate My Outfit'}
        </button>
        {loading && <ProgressBar value={50} label="Putting the look together" />}
        <p className="text-xs text-ink-400">Styling for: <span className="font-bold capitalize">{personType}</span> (change on the start page)</p>
      </div>

      {suggestion && (
        <div className="card mt-5">
          <h2 className="mb-1 text-xl font-bold text-ink-950">Your suggested look ✨</h2>
          {suggestion.notes.length > 0 && (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-ink-500">
              {suggestion.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          <ul className="space-y-2">
            {pieces.map((p) => (
              <li key={p.garmentId} className="flex items-center gap-3 rounded-2xl bg-ink-50 px-3 py-2">
                <span className="inline-block h-8 w-8 rounded-full ring-1 ring-ink-200" style={{ backgroundColor: p.colorway.base }} aria-hidden="true" />
                <span className="font-semibold text-ink-900">{garmentDisplayName(p.garmentId)}</span>
              </li>
            ))}
          </ul>
          <button onClick={tryLook} className="btn-primary mt-4 w-full">
            Try This Look →
          </button>
        </div>
      )}
    </div>
  );
}
