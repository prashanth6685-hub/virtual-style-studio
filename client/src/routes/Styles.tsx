import { useNavigate } from 'react-router-dom';
import type { Colorway, GarmentRef, Outfit, PersonType } from '@vss/shared';
import { useApp } from '../state/AppContext';
import { defaultColorwayFor } from '../lib/catalog';
import { PageTitle } from '../components/ui';

function cw(base: string): Colorway {
  return { ...defaultColorwayFor('tshirt'), base };
}

function piece(garmentId: string, base: string, fit = 'regular', size = 'M'): GarmentRef {
  return { garmentId, colorway: cw(base), fit, size };
}

interface StylePreset {
  id: string;
  name: string;
  icon: string;
  desc: string;
  outfits: Partial<Record<PersonType, Outfit>>;
}

/**
 * Curated presets. Garment ids are shared catalog ids, each valid for the
 * person type it is listed under (per the shared catalog's personTypes).
 */
const PRESETS: StylePreset[] = [
  {
    id: 'casual', name: 'Casual', icon: '👕', desc: 'Easy everyday comfort',
    outfits: {
      man: { top: piece('tshirt', '#FFFFFF'), bottom: piece('jeans', '#3B5B7E'), shoes: piece('sneakers', '#F7F6F4'), accessories: [] },
      woman: { top: piece('tshirt', '#F9C5D5'), bottom: piece('jeans', '#3B5B7E'), shoes: piece('sneakers', '#F7F6F4'), accessories: [] },
      boy: { top: piece('tshirt', '#2E5AAC'), bottom: piece('shorts', '#1E2A5A'), shoes: piece('sneakers', '#F7F6F4'), accessories: [] },
      girl: { dress: piece('casual-dress', '#FF7F50', 'regular'), shoes: piece('sandals', '#8B5E3C'), accessories: [] },
    },
  },
  {
    id: 'business-casual', name: 'Business Casual', icon: '👔', desc: 'Polished but relaxed',
    outfits: {
      man: { top: piece('shirt', '#F7F6F4'), bottom: piece('chinos', '#C3B091'), shoes: piece('sneakers', '#F7F6F4'), accessories: [piece('belt', '#5C4033'), piece('watch', '#4A4A4A')] },
      woman: { top: piece('blouse', '#F7F6F4'), bottom: piece('skirt', '#000000'), shoes: piece('heels', '#000000'), accessories: [piece('necklace', '#D4A017')] },
    },
  },
  {
    id: 'formal', name: 'Formal', icon: '🤵', desc: 'Suited up for big occasions',
    outfits: {
      man: { top: piece('shirt', '#FFFFFF'), outerwear: piece('blazer', '#1E2A5A'), bottom: piece('chinos', '#000000', 'slim'), shoes: piece('boots', '#5C4033'), accessories: [piece('tie', '#800000'), piece('belt', '#000000')] },
      woman: { dress: piece('maxi-dress', '#1E2A5A', 'regular'), outerwear: piece('blazer', '#000000'), shoes: piece('heels', '#000000'), accessories: [piece('earrings', '#D4A017'), piece('necklace', '#D4A017')] },
    },
  },
  {
    id: 'streetwear', name: 'Streetwear', icon: '🧢', desc: 'Bold, urban, effortless',
    outfits: {
      man: { top: piece('hoodie', '#000000', 'oversized'), bottom: piece('jeans', '#000000', 'relaxed'), shoes: piece('sneakers', '#DC143C'), accessories: [piece('cap', '#000000'), piece('sunglasses', '#23272E')] },
      woman: { top: piece('hoodie', '#F9C5D5', 'oversized'), bottom: piece('leggings', '#000000', 'slim'), shoes: piece('sneakers', '#F7F6F4'), accessories: [piece('cap', '#F9C5D5')] },
      boy: { top: piece('hoodie', '#2E5AAC', 'relaxed'), bottom: piece('jeans', '#3B5B7E'), shoes: piece('sneakers', '#F7F6F4'), accessories: [piece('cap', '#2E5AAC')] },
      girl: { top: piece('hoodie', '#C8A2C8', 'relaxed'), bottom: piece('leggings', '#000000', 'slim'), shoes: piece('sneakers', '#F7F6F4'), accessories: [] },
    },
  },
  {
    id: 'minimalist', name: 'Minimalist', icon: '⚪', desc: 'Clean lines, neutral tones',
    outfits: {
      man: { top: piece('tshirt', '#F7F6F4'), bottom: piece('chinos', '#8B7D6B'), shoes: piece('sneakers', '#F7F6F4'), accessories: [piece('watch', '#4A4A4A')] },
      woman: { top: piece('tank-top', '#F7F6F4'), bottom: piece('skirt', '#8B7D6B'), shoes: piece('sandals', '#C3B091'), accessories: [] },
    },
  },
  {
    id: 'party', name: 'Party', icon: '🎉', desc: 'Stand out after dark',
    outfits: {
      man: { top: piece('shirt', '#000000'), outerwear: piece('blazer', '#8E4585'), bottom: piece('chinos', '#000000', 'slim'), shoes: piece('boots', '#000000'), accessories: [piece('watch', '#D4A017')] },
      woman: { dress: piece('casual-dress', '#EC4899', 'regular'), shoes: piece('heels', '#000000'), accessories: [piece('earrings', '#D4A017'), piece('necklace', '#D4A017')] },
    },
  },
  {
    id: 'summer', name: 'Summer', icon: '☀️', desc: 'Light, breezy, sun-ready',
    outfits: {
      man: { top: piece('tshirt', '#7FB3D5'), bottom: piece('shorts', '#FFF8E7'), shoes: piece('sandals', '#8B5E3C'), accessories: [piece('sunglasses', '#23272E')] },
      woman: { dress: piece('casual-dress', '#F9C5D5', 'relaxed'), shoes: piece('sandals', '#C3B091'), accessories: [piece('hat', '#FFF8E7'), piece('sunglasses', '#23272E')] },
      boy: { top: piece('tshirt', '#7FB3D5'), bottom: piece('shorts', '#1E2A5A'), shoes: piece('sandals', '#8B5E3C'), accessories: [piece('cap', '#FACC15')] },
      girl: { dress: piece('casual-dress', '#AAF0C1', 'relaxed'), shoes: piece('sandals', '#C3B091'), accessories: [piece('hat', '#FFF8E7')] },
    },
  },
  {
    id: 'winter', name: 'Winter', icon: '❄️', desc: 'Layered up and cozy',
    outfits: {
      man: { top: piece('sweater', '#8B5E3C'), outerwear: piece('denim-jacket', '#3B5B7E'), bottom: piece('jeans', '#1E2A5A'), shoes: piece('boots', '#5C4033'), accessories: [piece('scarf', '#CB4335')] },
      woman: { top: piece('sweater', '#E6E6FA'), outerwear: piece('denim-jacket', '#3B5B7E'), bottom: piece('leggings', '#000000', 'slim'), shoes: piece('boots', '#5C4033'), accessories: [piece('scarf', '#8E4585')] },
      boy: { top: piece('hoodie', '#1E2A5A'), outerwear: piece('denim-jacket', '#3B5B7E'), bottom: piece('jeans', '#3B5B7E'), shoes: piece('boots', '#5C4033'), accessories: [piece('scarf', '#CB4335')] },
      girl: { top: piece('sweater', '#E6E6FA'), outerwear: piece('denim-jacket', '#3B5B7E'), bottom: piece('leggings', '#000000', 'slim'), shoes: piece('sneakers', '#F7F6F4'), accessories: [piece('scarf', '#C8A2C8')] },
    },
  },
  {
    id: 'traditional', name: 'Traditional', icon: '🪔', desc: 'Heritage Indian wear',
    outfits: {
      man: { top: piece('kurta', '#FFF8E7'), bottom: piece('chinos', '#F7F6F4'), shoes: piece('sandals', '#8B5E3C'), accessories: [] },
      woman: { dress: piece('saree', '#DC143C', 'regular'), shoes: piece('sandals', '#D4A017'), accessories: [piece('earrings', '#D4A017'), piece('necklace', '#D4A017')] },
      boy: { top: piece('kurta', '#FACC15'), bottom: piece('chinos', '#F7F6F4'), shoes: piece('sandals', '#8B5E3C'), accessories: [] },
      girl: { top: piece('kurti', '#EC4899'), bottom: piece('leggings', '#F7F6F4', 'slim'), shoes: piece('sandals', '#D4A017'), accessories: [piece('earrings', '#D4A017')] },
    },
  },
  {
    id: 'athletic', name: 'Athletic', icon: '🏃', desc: 'Made to move',
    outfits: {
      man: { top: piece('tshirt', '#000000'), bottom: piece('shorts', '#000000'), shoes: piece('sneakers', '#F7F6F4'), accessories: [piece('cap', '#000000')] },
      woman: { top: piece('tank-top', '#7C3AED'), bottom: piece('leggings', '#000000', 'slim'), shoes: piece('sneakers', '#F7F6F4'), accessories: [] },
      boy: { top: piece('tshirt', '#228B22'), bottom: piece('shorts', '#000000'), shoes: piece('sneakers', '#F7F6F4'), accessories: [] },
      girl: { top: piece('tshirt', '#EC4899'), bottom: piece('leggings', '#000000', 'slim'), shoes: piece('sneakers', '#F7F6F4'), accessories: [] },
    },
  },
];

/** /styles — preset looks per person type, one tap to the studio. */
export default function Styles() {
  const { personType, replaceOutfit, toast, model } = useApp();
  const navigate = useNavigate();

  const apply = (preset: StylePreset) => {
    const outfit = preset.outfits[personType] ?? preset.outfits.woman ?? preset.outfits.man;
    if (!outfit) {
      toast('This style has no preset for the current person type yet.', 'error');
      return;
    }
    replaceOutfit({ ...outfit, accessories: outfit.accessories ?? [] });
    toast(`"${preset.name}" loaded — opening the studio.`, 'success');
    navigate('/studio');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Explore Styles"
        sub={`Curated looks for ${personType} — tap one to try it in the studio.`}
      />
      {!model && (
        <p className="card mb-4 text-sm text-ink-500">
          💡 Tip: <a href="/create" className="font-bold text-brand-600 underline">create your model</a> first
          so styles preview on you.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PRESETS.map((p) => {
          const has = Boolean(p.outfits[personType]);
          return (
            <button
              key={p.id}
              onClick={() => apply(p)}
              disabled={!has}
              className="card group flex min-h-[150px] flex-col items-center justify-center gap-1.5 p-4 text-center transition hover:-translate-y-0.5 hover:shadow-pop disabled:opacity-40"
              aria-label={`Try ${p.name} style`}
            >
              <span aria-hidden="true" className="text-5xl transition group-hover:scale-110">
                {p.icon}
              </span>
              <span className="font-bold text-ink-950">{p.name}</span>
              <span className="text-xs text-ink-400">{has ? p.desc : 'Not available for this person type'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
