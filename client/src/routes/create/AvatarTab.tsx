import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, avatarModelRef } from '../../state/AppContext';
import AvatarSVG from '../../avatar/AvatarSVG';
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from '../../avatar/types';
import type { AvatarConfig, AvatarPose } from '../../avatar/types';
import type { PersonType } from '@vss/shared';
import { defaultAvatarConfig } from '../../avatar/avatarDefaults';
import { validateAvatarConfig } from '../../avatar/validation';
import { createAvatar, generateAvatar, listAvatars, pollJob, ApiError, type AvatarDto, type GeneratedPerson } from '../../lib/api';
import { Swatch, SegmentedTabs, Modal, Skeleton } from '../../components/ui';

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`chip min-h-[40px] ring-1 transition ${
              value === o.value
                ? 'bg-ink-950 text-white ring-ink-950'
                : 'bg-white text-ink-700 ring-ink-200 hover:ring-ink-400'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={`slider-${label}`}>{label}</label>
      <input
        id={`slider-${label}`}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink-900"
      />
    </div>
  );
}

const POSES: { value: AvatarPose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'three-quarter', label: '¾ view' },
  { value: 'side', label: 'Side' },
];

/** Create Avatar tab: parametric builder with live preview. */
export default function AvatarTab() {
  const { personType, setModel, toast } = useApp();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AvatarConfig>(() => defaultAvatarConfig(personType));
  const [pose, setPose] = useState<AvatarPose>('front');
  const [saved, setSaved] = useState<AvatarDto[] | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [realisticUrl, setRealisticUrl] = useState<string | null>(null);

  // keep config personType in sync if user switched person on /start
  const pt: PersonType = personType;

  const patch = (p: Partial<AvatarConfig>) => setConfig((c) => ({ ...c, ...p, personType: pt }));
  const patchFace = (p: Partial<AvatarConfig['face']>) =>
    setConfig((c) => ({ ...c, personType: pt, face: { ...c.face, ...p } }));
  const patchHair = (p: Partial<AvatarConfig['hair']>) =>
    setConfig((c) => ({ ...c, personType: pt, hair: { ...c.hair, ...p } }));
  const patchBody = (p: Partial<AvatarConfig['body']>) =>
    setConfig((c) => ({ ...c, personType: pt, body: { ...c.body, ...p } }));

  const errors = useMemo(() => validateAvatarConfig({ ...config, personType: pt }).errors, [config, pt]);
  const isKid = pt === 'boy' || pt === 'girl';
  const isMan = pt === 'man';

  const useAvatar = () => {
    if (errors.length) {
      toast(`Please fix: ${errors[0]}`, 'error');
      return;
    }
    setModel(avatarModelRef({ ...config, personType: pt }));
    toast('Avatar ready — opening the studio.', 'success');
    navigate('/studio');
  };

  const saveAvatar = async () => {
    if (errors.length) {
      toast(`Please fix: ${errors[0]}`, 'error');
      return;
    }
    const avatarName = name.trim() || `My Avatar`;
    setSaving(true);
    try {
      await createAvatar(avatarName, pt, { ...config, personType: pt });
      toast(`Saved "${avatarName}".`, 'success');
      setName('');
      setSaved(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openSaved = async () => {
    setShowSaved(true);
    if (saved) return;
    try {
      setSaved(await listAvatars());
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not load saved avatars.', 'error');
      setSaved([]);
    }
  };

  /** Generate a photorealistic person from the current parametric config. */
  const makeRealistic = async () => {
    if (errors.length) {
      toast(`Please fix: ${errors[0]}`, 'error');
      return;
    }
    setGenBusy(true);
    setGenProgress(0);
    setRealisticUrl(null);
    try {
      const { jobId } = await generateAvatar({ ...config, personType: pt });
      const result = await pollJob<GeneratedPerson[]>(jobId, {
        onProgress: (j) => setGenProgress(j.progress),
      });
      const url = result?.[0]?.url;
      if (!url) {
        toast('No image came back — try again.', 'error');
        return;
      }
      setRealisticUrl(url);
      toast('Realistic avatar ready.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Generation failed. Try again.', 'error');
    } finally {
      setGenBusy(false);
    }
  };

  /** Lock the generated realistic image in as this session's model. */
  const useRealistic = () => {
    if (!realisticUrl) return;
    setModel({ kind: 'aiPerson', imageUrl: realisticUrl });
    toast('Realistic model selected — opening the studio.', 'success');
    navigate('/studio');
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
      {/* Live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="card overflow-hidden !p-0">
          <div className="bg-gradient-to-b from-ink-100 to-ink-50 px-6 pt-4">
            <AvatarSVG config={{ ...config, personType: pt }} pose={pose} title="Avatar preview" />
          </div>
          <div className="p-4">
            <SegmentedTabs<AvatarPose> ariaLabel="Pose" value={pose} onChange={(v) => setPose(v)} options={POSES} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button onClick={useAvatar} className="btn-accent w-full">
            Use This Avatar →
          </button>
          <button onClick={makeRealistic} disabled={genBusy} className="btn-primary w-full">
            {genBusy ? `Creating your realistic avatar… ${Math.round(genProgress)}%` : '✨ Make it realistic'}
          </button>
          {(genBusy || realisticUrl) && (
            <div className="card !p-3">
              {genBusy && !realisticUrl && <Skeleton className="aspect-[3/4] w-full" aria-label="Generating realistic avatar" />}
              {realisticUrl && (
                <>
                  <img
                    src={realisticUrl}
                    alt="Realistic AI avatar"
                    className="aspect-[3/4] w-full rounded-2xl bg-ink-100 object-cover"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={useRealistic} className="btn-accent !px-2 text-sm">
                      Use this avatar →
                    </button>
                    <button onClick={makeRealistic} disabled={genBusy} className="btn-ghost !px-2 text-sm">
                      ↻ Regenerate
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-400">
                    AI-generated and fully clothed — this image becomes your locked model for try-on.
                  </p>
                </>
              )}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={saveAvatar} disabled={saving} className="btn-ghost !px-2 text-sm">
              {saving ? 'Saving…' : '💾 Save'}
            </button>
            <button onClick={() => patch(defaultAvatarConfig(pt))} className="btn-ghost !px-2 text-sm">
              ↺ Reset
            </button>
            <button onClick={openSaved} className="btn-ghost !px-2 text-sm">
              📂 Edit
            </button>
          </div>
          <input
            className="field"
            placeholder="Avatar name (for saving)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Avatar name"
            maxLength={40}
          />
        </div>
      </div>

      {/* Control panel */}
      <div className="space-y-4">
        {/* Skin */}
        <section className="card" aria-labelledby="skin-h">
          <h3 id="skin-h" className="mb-3 font-bold text-ink-900">Skin</h3>
          <span className="label">Skin tone</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Skin tone">
            {SKIN_TONES.map((hex, i) => (
              <Swatch key={hex} hex={hex} size={38} label={`Skin tone ${i + 1} of 12`} selected={config.skinTone === i + 1} onSelect={() => patch({ skinTone: i + 1 })} />
            ))}
          </div>
          <div className="mt-3">
            <Chips
              label="Undertone"
              value={config.undertone}
              onChange={(v) => patch({ undertone: v })}
              options={[
                { value: 'warm', label: 'Warm' },
                { value: 'cool', label: 'Cool' },
                { value: 'neutral', label: 'Neutral' },
              ]}
            />
          </div>
        </section>

        {/* Face */}
        <section className="card space-y-4" aria-labelledby="face-h">
          <h3 id="face-h" className="font-bold text-ink-900">Face</h3>
          <Chips label="Face shape" value={config.face.shape} onChange={(v) => patchFace({ shape: v })}
            options={['oval', 'round', 'square', 'heart', 'diamond', 'oblong'].map((s) => ({ value: s as AvatarConfig['face']['shape'], label: s[0].toUpperCase() + s.slice(1) }))} />
          <Chips label="Eye shape" value={config.face.eyeShape} onChange={(v) => patchFace({ eyeShape: v })}
            options={['almond', 'round', 'hooded', 'monolid'].map((s) => ({ value: s as AvatarConfig['face']['eyeShape'], label: s[0].toUpperCase() + s.slice(1) }))} />
          <div>
            <span className="label">Eye color</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Eye color">
              {(['brown', 'black', 'hazel', 'green', 'blue', 'gray'] as const).map((ec) => (
                <Swatch
                  key={ec}
                  hex={{ brown: '#5a3a22', black: '#241d18', hazel: '#8a6b34', green: '#4a7c59', blue: '#4a7ca8', gray: '#7d8891' }[ec]}
                  size={36}
                  label={ec}
                  selected={config.face.eyeColor === ec}
                  onSelect={() => patchFace({ eyeColor: ec })}
                />
              ))}
            </div>
          </div>
          <Chips label="Eyebrows" value={config.face.brows} onChange={(v) => patchFace({ brows: v })}
            options={['thin', 'medium', 'thick', 'arched', 'straight'].map((s) => ({ value: s as AvatarConfig['face']['brows'], label: s[0].toUpperCase() + s.slice(1) }))} />
          <Chips label="Nose" value={config.face.nose} onChange={(v) => patchFace({ nose: v })}
            options={['button', 'straight', 'wide', 'pointed'].map((s) => ({ value: s as AvatarConfig['face']['nose'], label: s[0].toUpperCase() + s.slice(1) }))} />
          <Chips label="Lips" value={config.face.lips} onChange={(v) => patchFace({ lips: v })}
            options={['full', 'medium', 'thin'].map((s) => ({ value: s as AvatarConfig['face']['lips'], label: s[0].toUpperCase() + s.slice(1) }))} />
          {isMan && (
            <Chips label="Facial hair" value={config.face.facialHair} onChange={(v) => patchFace({ facialHair: v })}
              options={['none', 'stubble', 'mustache', 'goatee', 'beard'].map((s) => ({ value: s as AvatarConfig['face']['facialHair'], label: s[0].toUpperCase() + s.slice(1) }))} />
          )}
          {!isMan && !isKid && (
            <Chips label="Makeup" value={config.face.makeup} onChange={(v) => patchFace({ makeup: v })}
              options={['none', 'natural', 'bold'].map((s) => ({ value: s as AvatarConfig['face']['makeup'], label: s[0].toUpperCase() + s.slice(1) }))} />
          )}
        </section>

        {/* Hair */}
        <section className="card space-y-4" aria-labelledby="hair-h">
          <h3 id="hair-h" className="font-bold text-ink-900">Hair</h3>
          <div>
            <span className="label">Hair color</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hair color">
              {HAIR_COLORS.map((h) => (
                <Swatch key={h.hex} hex={h.hex} size={36} label={h.name} selected={config.hair.color === h.hex} onSelect={() => patchHair({ color: h.hex })} />
              ))}
            </div>
          </div>
          <Chips label="Style" value={config.hair.style} onChange={(v) => {
            const texture = v === 'curly-top' ? 'curly' as const : v === 'afro' ? 'coily' as const : config.hair.texture === 'bald' ? 'straight' as const : config.hair.texture;
            const length = ['long', 'braids', 'ponytail', 'pigtails'].includes(v) ? 'long' as const : v === 'bob' ? 'medium' as const : 'short' as const;
            patchHair({ style: v, texture, length });
          }}
            options={HAIR_STYLES[pt].map((s) => ({ value: s.id, label: s.name }))} />
          <Chips label="Texture" value={config.hair.texture} onChange={(v) => patchHair({ texture: v })}
            options={['straight', 'wavy', 'curly', 'coily', 'bald'].map((s) => ({ value: s as AvatarConfig['hair']['texture'], label: s[0].toUpperCase() + s.slice(1) }))} />
        </section>

        {/* Body */}
        <section className="card space-y-4" aria-labelledby="body-h">
          <h3 id="body-h" className="font-bold text-ink-900">Body</h3>
          <Chips label="Build" value={config.body.build} onChange={(v) => patchBody({ build: v })}
            options={['slim', 'athletic', 'average', 'curvy', 'plus'].map((s) => ({ value: s as AvatarConfig['body']['build'], label: s[0].toUpperCase() + s.slice(1) }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SliderRow label="Height" value={config.body.height} onChange={(v) => patchBody({ height: v })} />
            <SliderRow label="Shoulders" value={config.body.shoulder} onChange={(v) => patchBody({ shoulder: v })} />
            <SliderRow label="Waist" value={config.body.waist} onChange={(v) => patchBody({ waist: v })} />
            <SliderRow label="Hips" value={config.body.hips} onChange={(v) => patchBody({ hips: v })} />
          </div>
          <Chips label="Age appearance" value={config.ageGroup} onChange={(v) => patch({ ageGroup: v })}
            options={(isKid ? ['child', 'teen'] : ['teen', 'adult', 'senior']).map((s) => ({ value: s as AvatarConfig['ageGroup'], label: s[0].toUpperCase() + s.slice(1) }))} />
        </section>

        {errors.length > 0 && (
          <div className="card border-red-200 bg-red-50 text-sm text-red-800" role="alert">
            {errors[0]}
          </div>
        )}
      </div>

      {/* Saved avatars modal (Edit) */}
      <Modal open={showSaved} onClose={() => setShowSaved(false)} title="My saved avatars">
        {saved === null ? (
          <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">
            No saved avatars yet. Design one and tap <strong>Save</strong>.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {saved.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setConfig({ ...a.config, personType: pt });
                  setShowSaved(false);
                  toast(`Loaded "${a.name}" for editing.`, 'success');
                }}
                className="card !p-2 text-center transition hover:shadow-pop"
              >
                <AvatarSVG config={a.config} title={a.name} />
                <div className="truncate px-1 pb-1 text-sm font-bold text-ink-800">{a.name}</div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
