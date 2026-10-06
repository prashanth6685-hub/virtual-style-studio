import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppContext';
import { generatePeople, pollJob, ApiError, type PersonFilters, type GeneratedPerson } from '../../lib/api';
import { SKIN_TONES, HAIR_STYLES, HAIR_COLORS } from '../../avatar/types';
import { Swatch, Skeleton, SegmentedTabs } from '../../components/ui';

const AGE_GROUPS = [
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teen' },
  { value: 'adult', label: 'Adult' },
  { value: 'senior', label: 'Senior' },
];

const BODY_TYPES = [
  { value: 'slim', label: 'Slim' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'average', label: 'Average' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'plus', label: 'Plus' },
];

interface PersonImage {
  url: string;
  id?: string;
}

/** Choose AI Person tab: neutral filters, generate 8, pick one. */
export default function AiPersonTab() {
  const { personType, setModel, toast } = useApp();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PersonFilters>({ ageGroup: 'adult' });
  const [people, setPeople] = useState<PersonImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const set = <K extends keyof PersonFilters>(k: K, v: PersonFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    setLoading(true);
    setProgress(0);
    setPeople([]);
    try {
      const { jobId } = await generatePeople(filters, 8);
      const result = await pollJob<GeneratedPerson[]>(jobId, {
        onProgress: (j) => setProgress(j.progress),
      });
      const images = (result ?? []).map((p) => ({ url: p.url }));
      setPeople(images);
      if (!images.length) toast('No people came back — try again.', 'error');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Generation failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const choose = (url: string) => {
    setSelected(url);
    setModel({ kind: 'aiPerson', imageUrl: url });
    toast('Model selected — opening the studio.', 'success');
    navigate('/studio');
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Neutral filter bar — appearance descriptors only, no stereotyping labels */}
      <div className="card">
        <h3 className="mb-3 font-bold text-ink-900">Describe the model</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="label" id="age-label">Age group</span>
            <SegmentedTabs
              ariaLabel="Age group"
              value={filters.ageGroup ?? 'adult'}
              onChange={(v) => set('ageGroup', v)}
              options={AGE_GROUPS}
            />
          </div>
          <div>
            <span className="label" id="body-label">Body type</span>
            <SegmentedTabs
              ariaLabel="Body type"
              value={filters.bodyType ?? 'average'}
              onChange={(v) => set('bodyType', v)}
              options={BODY_TYPES}
            />
          </div>
          <div>
            <span className="label">Skin tone</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Skin tone">
              {SKIN_TONES.map((hex, i) => (
                <Swatch
                  key={hex}
                  hex={hex}
                  size={36}
                  label={`Skin tone ${i + 1}`}
                  selected={filters.skinTone === i + 1}
                  onSelect={() => set('skinTone', i + 1)}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="hair-color">Hair color</label>
            <select
              id="hair-color"
              className="field"
              value={filters.hairColor ?? ''}
              onChange={(e) => set('hairColor', e.target.value || undefined)}
            >
              <option value="">Any</option>
              {HAIR_COLORS.map((h) => (
                <option key={h.hex} value={h.hex}>{h.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="hair-style">Hair style</label>
            <select
              id="hair-style"
              className="field"
              value={filters.hairStyle ?? ''}
              onChange={(e) => set('hairStyle', e.target.value || undefined)}
            >
              <option value="">Any</option>
              {HAIR_STYLES[personType].map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={generate} disabled={loading} className="btn-accent mt-5 w-full sm:w-auto">
          {loading ? `Generating… ${Math.round(progress)}%` : people.length ? 'Generate More People' : '✨ Generate People'}
        </button>
        <p className="mt-2 text-xs text-ink-400">
          AI-generated models are illustrations for try-on — fully clothed, modest, non-sexualized.
        </p>
      </div>

      {/* Grid */}
      <div className="mt-5">
        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Loading people">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        )}
        {!loading && people.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="list" aria-label="Generated people">
            {people.map((p, i) => (
              <button
                key={p.id ?? p.url ?? i}
                role="listitem"
                onClick={() => choose(p.url)}
                aria-label={`Select model ${i + 1}`}
                className={`group relative overflow-hidden rounded-3xl ring-2 transition ${
                  selected === p.url ? 'ring-brand-500' : 'ring-transparent hover:ring-ink-300'
                }`}
              >
                <img
                  src={p.url}
                  alt={`Generated model ${i + 1}`}
                  loading="lazy"
                  className="aspect-[3/4] w-full bg-ink-100 object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 to-transparent p-3 pt-8 text-left text-sm font-bold text-white opacity-0 transition group-hover:opacity-100">
                  Use this model →
                </span>
              </button>
            ))}
          </div>
        )}
        {!loading && people.length === 0 && (
          <div className="card py-10 text-center text-sm text-ink-400">
            No people yet — describe your model above and tap <strong>Generate People</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
