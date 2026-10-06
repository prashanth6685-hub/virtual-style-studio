import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  CatalogItem,
  ColorStyle,
  Colorway,
  GarmentRef,
  Outfit,
} from '@vss/shared';
import { PALETTE, applyColorStyle, itemById } from '@vss/shared';
import { useApp, avatarConfigOf } from '../state/AppContext';
import AvatarSVG from '../avatar/AvatarSVG';
import { defaultAvatarConfig } from '../avatar/avatarDefaults';
import type { OutfitSlot } from '../state/outfit';
import { outfitPieceCount } from '../state/outfit';
import {
  renderableCatalog,
  defaultColorwayFor,
  garmentDisplayName,
  tabForCatalogId,
  RENDER_PATTERNS,
  MATERIALS,
} from '../lib/catalog';
import {
  tryOn,
  pollJob,
  createLook,
  matchColors,
  ApiError,
  type ColorMatchDto,
} from '../lib/api';
import { Swatch, SegmentedTabs, EmptyState, BeforeAfter, ProgressBar, PageTitle } from '../components/ui';

const TABS = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];

const COLOR_STYLES: { id: ColorStyle; label: string }[] = [
  { id: 'pastel', label: 'Pastel' },
  { id: 'neon', label: 'Neon' },
  { id: 'jewel', label: 'Jewel' },
  { id: 'earth', label: 'Earth' },
  { id: 'muted', label: 'Muted' },
];

function slotForTab(tab: string): OutfitSlot | 'accessory' {
  switch (tab) {
    case 'Tops': return 'top';
    case 'Bottoms': return 'bottom';
    case 'Dresses': return 'dress';
    case 'Outerwear': return 'outerwear';
    case 'Shoes': return 'shoes';
    default: return 'accessory';
  }
}

/** Avatar models always render with a modest base outfit (never unclothed). */
function baseAvatarOutfit(): Outfit {
  const g = (garmentId: string, fit: string, size: string): GarmentRef => ({
    garmentId,
    colorway: defaultColorwayFor(garmentId),
    fit,
    size,
  });
  return {
    top: g('tshirt', 'regular', 'M'),
    bottom: g('jeans', 'regular', 'M'),
    shoes: g('sneakers', 'regular', 'UK 8'),
    accessories: [],
  };
}

/** Tiny garment preview rendered on the person's avatar (or a default one). */
function GarmentThumb({ garmentId, colorway }: { garmentId: string; colorway: Colorway }) {
  const { personType, model } = useApp();
  const config = useMemo(
    () => avatarConfigOf(model) ?? defaultAvatarConfig(personType),
    [model, personType],
  );
  return (
    <div className="mx-auto h-20 w-14 overflow-hidden" aria-hidden="true">
      <AvatarSVG
        config={config}
        outfit={[{ garmentId, colorway }]}
        title={garmentDisplayName(garmentId)}
      />
    </div>
  );
}

interface Selection {
  slot: OutfitSlot | 'accessory';
  garmentId: string;
}

export default function Studio() {
  const {
    personType, model, outfit, setSlot, addAccessory, removeAccessory, updateItem,
    replaceOutfit, toast,
  } = useApp();

  const [tab, setTab] = useState('Tops');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [trying, setTrying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lookName, setLookName] = useState('');
  const [savingLook, setSavingLook] = useState(false);
  const [matches, setMatches] = useState<ColorMatchDto[]>([]);
  const [matchesFor, setMatchesFor] = useState<string>('');

  const catalog = useMemo(() => renderableCatalog(personType), [personType]);
  const isAvatar = model?.kind === 'avatar';
  const avatarConfig = avatarConfigOf(model);

  // Avatar models get a modest base outfit so the figure is never unclothed.
  useEffect(() => {
    if (isAvatar && outfitPieceCount(outfit) === 0) {
      replaceOutfit(baseAvatarOutfit());
    }
    // run once per model change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvatar]);

  if (!model) {
    return (
      <div className="mx-auto max-w-xl">
        <PageTitle title="Studio" sub="Your virtual fitting room." />
        <EmptyState
          icon="🪞"
          title="No model yet"
          body="Create your model first — upload a photo, pick an AI person, or build an avatar."
          action={<Link to="/create" className="btn-accent">Create My Model</Link>}
        />
      </div>
    );
  }

  const outfitItems: GarmentRef[] = [
    outfit.top, outfit.bottom, outfit.dress, outfit.outerwear, outfit.shoes,
  ].filter(Boolean) as GarmentRef[];
  const allItems = [...outfitItems, ...(outfit.accessories ?? [])];

  const itemsForTab = catalog.filter((c) => tabForCatalogId(c.id) === tab);

  const pickGarment = (item: CatalogItem) => {
    const slot = slotForTab(tab);
    const existing =
      slot === 'accessory'
        ? (outfit.accessories ?? []).find((a) => a.garmentId === item.id)
        : outfit[slot as OutfitSlot];
    if (existing && existing.garmentId === item.id) {
      // toggle off
      if (slot === 'accessory') removeAccessory(item.id);
      else setSlot(slot as OutfitSlot, null);
      setSelection(null);
      return;
    }
    const fresh: GarmentRef = {
      garmentId: item.id,
      colorway: existing?.colorway ?? defaultColorwayFor(item.id),
      fit: item.fits[0],
      size: item.sizes[Math.floor(item.sizes.length / 2)],
    };
    if (slot === 'accessory') addAccessory(fresh);
    else setSlot(slot as OutfitSlot, fresh);
    setSelection({ slot, garmentId: item.id });
  };

  const selectedItem: GarmentRef | undefined =
    selection == null
      ? undefined
      : selection.slot === 'accessory'
        ? (outfit.accessories ?? []).find((a) => a.garmentId === selection.garmentId)
        : outfit[selection.slot as OutfitSlot]?.garmentId === selection.garmentId
          ? outfit[selection.slot as OutfitSlot]
          : undefined;

  const patchColorway = (patch: Partial<Colorway>) => {
    if (!selection || !selectedItem) return;
    updateItem(selection.slot, selection.garmentId, {
      colorway: { ...selectedItem.colorway, ...patch },
    });
  };

  const loadMatches = async (hex: string) => {
    if (matchesFor === hex) return;
    setMatchesFor(hex);
    try {
      setMatches(await matchColors(hex));
    } catch {
      setMatches([]);
    }
  };

  const doTryOn = async () => {
    if (outfitPieceCount(outfit) === 0) {
      toast('Add at least one garment first.', 'error');
      return;
    }
    const tryOutfit: Outfit = {
      top: outfit.top, bottom: outfit.bottom, dress: outfit.dress,
      outerwear: outfit.outerwear, shoes: outfit.shoes,
      accessories: outfit.accessories ?? [],
    };
    if (isAvatar) {
      // Instant client-side render — the preview IS the result.
      setResultUrl(null);
      setShowResult(true);
      toast('✨ Rendered instantly on your avatar.', 'success');
      return;
    }
    // Photo / AI-person: async server job.
    setTrying(true);
    setProgress(0);
    try {
      const res = await tryOn({ model, outfit: tryOutfit });
      if ('render' in res && res.render === 'client') {
        // Server says: render client-side from the spec (avatar-style instant path).
        setResultUrl(null);
      } else {
        const jobId =
          'jobId' in res && res.render === 'server'
            ? res.jobId
            : (res as unknown as { jobId: string }).jobId;
        if (!jobId) {
          // Legacy {svg} payload tolerance.
          const svg = (res as unknown as { svg?: string }).svg;
          if (svg) setResultUrl(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
          else throw new ApiError(422, 'The server returned an unexpected try-on response.');
        } else {
          const result = await pollJob<{ url?: string; imageUrl?: string }>(jobId, {
            onProgress: (j) => setProgress(j.progress),
          });
          const url = result.url ?? result.imageUrl;
          if (!url) throw new ApiError(422, 'The AI did not return an image.');
          setResultUrl(url);
        }
      }
      setShowResult(true);
      toast('Your look is ready!', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Try-on failed. Please retry.', 'error');
    } finally {
      setTrying(false);
    }
  };

  const saveLook = async () => {
    const name = lookName.trim() || `Look ${new Date().toLocaleDateString()}`;
    setSavingLook(true);
    try {
      await createLook({
        name,
        outfit: {
          top: outfit.top, bottom: outfit.bottom, dress: outfit.dress,
          outerwear: outfit.outerwear, shoes: outfit.shoes,
          accessories: outfit.accessories ?? [],
        },
        resultImageUrl: resultUrl ?? undefined,
        modelRef: model,
      });
      toast(`Saved "${name}".`, 'success');
      setLookName('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save the look.', 'error');
    } finally {
      setSavingLook(false);
    }
  };

  const modelPreview = isAvatar && avatarConfig ? (
    <AvatarSVG config={avatarConfig} outfit={allItems} title="Your avatar wearing the current outfit" />
  ) : (
    <img
      src={model.imageUrl}
      alt="Your model"
      className="h-full w-full bg-ink-100 object-contain"
    />
  );

  const baseOutfit = useMemo(() => baseAvatarOutfit(), []);
  const beforeItems: GarmentRef[] = useMemo(
    () => [baseOutfit.top, baseOutfit.bottom, baseOutfit.shoes, ...(baseOutfit.accessories ?? [])].filter(Boolean) as GarmentRef[],
    [baseOutfit],
  );
  const beforeNode = isAvatar && avatarConfig ? (
    <AvatarSVG config={avatarConfig} outfit={beforeItems} title="Avatar before styling" />
  ) : (
    <img src={model.imageUrl} alt="Before" className="h-full w-full object-contain" />
  );
  const afterNode =
    resultUrl != null ? (
      <img src={resultUrl} alt="Try-on result" className="h-full w-full object-contain" />
    ) : isAvatar && avatarConfig ? (
      <AvatarSVG config={avatarConfig} outfit={allItems} title="Avatar after styling" />
    ) : null;

  return (
    <div>
      <PageTitle title="Studio" sub="Build the outfit, then try it on." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">
        {/* Preview — stays visible */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {showResult && afterNode ? (
            <BeforeAfter before={beforeNode} after={afterNode} />
          ) : (
            <div className="card overflow-hidden !p-0">
              <div className="mx-auto aspect-[3/4] max-h-[52dvh] w-full max-w-[340px] bg-gradient-to-b from-ink-100 to-ink-50 lg:max-h-[62dvh]">
                {modelPreview}
              </div>
            </div>
          )}
          {showResult && (
            <button onClick={() => setShowResult(false)} className="btn-ghost mt-3 w-full">
              ← Back to editing
            </button>
          )}

          <button
            onClick={doTryOn}
            disabled={trying || outfitPieceCount(outfit) === 0}
            className="btn-accent mt-3 w-full !min-h-[56px] !text-lg"
          >
            {trying ? 'Creating your look…' : '✨ Try It On'}
          </button>
          {trying && (
            <div className="card mt-3">
              <ProgressBar value={progress} label={`Creating your look… ${Math.round(progress)}%`} />
            </div>
          )}

          <div className="card mt-3">
            <label className="label" htmlFor="look-name">Save this look</label>
            <div className="flex gap-2">
              <input
                id="look-name"
                className="field"
                placeholder="Look name"
                value={lookName}
                onChange={(e) => setLookName(e.target.value)}
                maxLength={60}
              />
              <button onClick={saveLook} disabled={savingLook} className="btn-primary shrink-0">
                {savingLook ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div>
          <SegmentedTabs ariaLabel="Garment category" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t }))} />

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="listbox" aria-label={`${tab} options`}>
            {itemsForTab.map((item) => {
              const active = allItems.some((o) => o.garmentId === item.id);
              return (
                <button
                  key={item.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => pickGarment(item)}
                  className={`card flex !min-h-[44px] flex-col items-center !p-2 text-center transition ${
                    active ? '!bg-ink-950 !text-white shadow-pop' : 'hover:shadow-pop'
                  }`}
                >
                  <GarmentThumb garmentId={item.id} colorway={defaultColorwayFor(item.id)} />
                  <span className="mt-1 text-xs font-bold leading-tight">{item.name}</span>
                  {active && <span className="text-[10px] opacity-70">✓ selected</span>}
                </button>
              );
            })}
          </div>
          {itemsForTab.length === 0 && (
            <EmptyState icon="👕" title={`No ${tab.toLowerCase()} for ${personType}`} body="Try another category." />
          )}

          {/* Customizer */}
          {selection && selectedItem && (
            <div className="card mt-4" aria-label="Customize garment">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink-950">
                  {garmentDisplayName(selection.garmentId)}
                </h3>
                <button
                  onClick={() => {
                    const slot = selection.slot;
                    if (slot === 'accessory') removeAccessory(selection.garmentId);
                    else setSlot(slot, null);
                    setSelection(null);
                  }}
                  className="chip bg-red-50 text-sm font-bold text-red-700 ring-1 ring-red-200"
                >
                  Remove ✕
                </button>
              </div>

              {/* Color */}
              <h4 className="label">Color</h4>
              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {Object.entries(PALETTE).map(([group, colors]) => (
                  <div key={group}>
                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">{group}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {colors.map((c) => (
                        <Swatch
                          key={c.hex + c.name}
                          hex={c.hex}
                          size={32}
                          label={c.name}
                          selected={selectedItem.colorway.base.toLowerCase() === c.hex.toLowerCase()}
                          onSelect={() => patchColorway({ base: c.hex })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ink-700">
                  Custom
                  <input
                    type="color"
                    value={selectedItem.colorway.base}
                    onChange={(e) => patchColorway({ base: e.target.value })}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-ink-200 bg-white p-1"
                    aria-label="Custom color"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Color styles">
                  {COLOR_STYLES.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => patchColorway({ base: applyColorStyle(selectedItem.colorway.base, id) })}
                      className="chip bg-ink-100 text-xs font-bold text-ink-700"
                      title={`Apply ${label} tone`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => loadMatches(selectedItem.colorway.base)}
                className="btn-ghost mt-2 !min-h-[40px] text-sm"
              >
                🎨 Suggest matching colors
              </button>
              {matchesFor === selectedItem.colorway.base && matches.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Matching colors">
                  {matches.map((m) => (
                    <button
                      key={m.hex + m.name}
                      onClick={() => patchColorway({ base: m.hex })}
                      className="chip bg-white text-xs ring-1 ring-ink-200"
                      title={`${m.name} — ${m.relation}`}
                    >
                      <span className="mr-1 inline-block h-4 w-4 rounded-full" style={{ backgroundColor: m.hex }} />
                      {m.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Pattern */}
              <h4 className="label mt-4">Pattern</h4>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pattern">
                {RENDER_PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={selectedItem.colorway.pattern === p.id}
                    onClick={() => patchColorway({ pattern: p.id })}
                    className={`chip min-h-[40px] ring-1 ${selectedItem.colorway.pattern === p.id ? 'bg-ink-950 text-white ring-ink-950' : 'bg-white text-ink-700 ring-ink-200'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {selectedItem.colorway.pattern !== 'solid' && (
                <div className="mt-2">
                  <span className="label">Pattern color</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['#FFFFFF', '#000000', '#DC143C', '#2E5AAC', '#D4A017', '#228B22'].map((hex) => (
                      <Swatch
                        key={hex}
                        hex={hex}
                        size={32}
                        label={hex}
                        selected={(selectedItem.colorway.patternColor ?? '#FFFFFF').toLowerCase() === hex.toLowerCase()}
                        onSelect={() => patchColorway({ patternColor: hex })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Material */}
              <h4 className="label mt-4">Material</h4>
              <select
                className="field"
                value={selectedItem.colorway.material ?? 'cotton'}
                onChange={(e) => patchColorway({ material: e.target.value })}
                aria-label="Material"
              >
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
                ))}
              </select>

              {/* Fit & Size */}
              {(() => {
                const cat = itemById(selection.garmentId);
                return (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <span className="label">Fit</span>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Fit">
                        {(cat?.fits ?? ['regular']).map((f) => (
                          <button
                            key={f}
                            role="radio"
                            aria-checked={selectedItem.fit === f}
                            onClick={() => updateItem(selection.slot, selection.garmentId, { fit: f })}
                            className={`chip min-h-[40px] text-xs capitalize ring-1 ${selectedItem.fit === f ? 'bg-ink-950 text-white ring-ink-950' : 'bg-white text-ink-700 ring-ink-200'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="label">Size</span>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size">
                        {(cat?.sizes ?? ['M']).map((s) => (
                          <button
                            key={s}
                            role="radio"
                            aria-checked={selectedItem.size === s}
                            onClick={() => updateItem(selection.slot, selection.garmentId, { size: s })}
                            className={`chip min-h-[40px] text-xs ring-1 ${selectedItem.size === s ? 'bg-ink-950 text-white ring-ink-950' : 'bg-white text-ink-700 ring-ink-200'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Current outfit summary */}
          <div className="card mt-4">
            <h3 className="mb-2 font-bold text-ink-900">
              Current outfit {outfitPieceCount(outfit) > 0 && <span className="text-sm font-medium text-ink-400">({outfitPieceCount(outfit)} pieces)</span>}
            </h3>
            {outfitPieceCount(outfit) === 0 ? (
              <p className="text-sm text-ink-400">Nothing yet — pick garments above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allItems.map((o) => (
                  <button
                    key={o.garmentId}
                    onClick={() => setSelection({ slot: tabForCatalogId(o.garmentId) === 'Accessories' ? 'accessory' : slotForTab(tabForCatalogId(o.garmentId)), garmentId: o.garmentId })}
                    className="chip bg-ink-100 text-sm font-semibold text-ink-800"
                    title="Edit this item"
                  >
                    <span className="mr-1 inline-block h-4 w-4 rounded-full ring-1 ring-ink-300" style={{ backgroundColor: o.colorway.base }} />
                    {garmentDisplayName(o.garmentId)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
