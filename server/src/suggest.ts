/**
 * Rule-based outfit suggester (no AI needed).
 *
 * Given occasion / weather / style / color preference / budget / person type,
 * assembles a valid outfit from the shared catalog. Deterministic: the same
 * input always yields the same outfit.
 *
 * Safety: boy/girl suggestions are ALWAYS filtered through kidSafeOnly.
 */
import {
  CatalogItem,
  FITS,
  itemById,
  itemsFor,
  kidSafeOnly,
  nearestNamedColor,
  normalizeHex,
  Outfit,
  GarmentRef,
  PersonType,
  SuggestRequest,
  SuggestResponse,
} from '@vss/shared';

type Budget = 'budget' | 'mid' | 'premium';

const OCCASION_TOP: Record<string, string[]> = {
  formal: ['dress-shirt', 'blouse'],
  business: ['dress-shirt', 'blouse', 'shirt'],
  party: ['blouse', 'shirt', 'tunic'],
  athletic: ['tshirt', 'tank-top', 'hoodie'],
  traditional: ['kurta', 'kurti', 'sherwani', 'saree', 'lehenga', 'salwar-suit', 'anarkali'],
  casual: ['tshirt', 'polo', 'shirt', 'blouse', 'kurta', 'kurti'],
};

const OCCASION_BOTTOM: Record<string, string[]> = {
  formal: ['trousers', 'skirt', 'palazzo'],
  business: ['trousers', 'chinos', 'skirt'],
  party: ['jeans', 'skirt', 'palazzo'],
  athletic: ['shorts', 'joggers', 'leggings'],
  traditional: ['dhoti-set', 'salwar-suit'],
  casual: ['jeans', 'chinos', 'shorts', 'skirt', 'leggings'],
};

const OCCASION_DRESS = ['casual-dress', 'maxi-dress', 'sundress', 'gown', 'shift-dress', 'frock', 'anarkali'];
/** Traditional occasions prefer indian-wear silhouettes over western dresses. */
const TRADITIONAL_DRESS = ['anarkali', 'salwar-suit', 'saree', 'lehenga', 'kurti'];
const DRESS_OCCASIONS = new Set(['formal', 'party', 'traditional']);

const OCCASION_SHOES: Record<string, string[]> = {
  formal: ['formal-shoes', 'heels', 'flats', 'loafers'],
  business: ['formal-shoes', 'flats', 'loafers'],
  party: ['heels', 'flats', 'loafers', 'sneakers'],
  athletic: ['running-shoes', 'sneakers'],
  traditional: ['sandals', 'flats', 'loafers'],
  casual: ['sneakers', 'sandals', 'flip-flops', 'flats'],
};

const COLD_OUTERWEAR = ['parka', 'overcoat', 'sweater', 'cardigan', 'denim-jacket', 'shawl'];
const MILD_OUTERWEAR = ['denim-jacket', 'cardigan', 'windbreaker', 'shrug', 'shawl', 'nehru-jacket'];

function normalizeWord(s: string | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

function pick(pool: CatalogItem[], ids: string[], budget?: Budget): CatalogItem | undefined {
  const byId = new Map(pool.map((i) => [i.id, i]));
  const candidates = ids.map((id) => byId.get(id)).filter((i): i is CatalogItem => !!i);
  if (candidates.length === 0) return undefined;
  if (budget) {
    const tiered = candidates.filter((i) => i.priceTier === budget);
    if (tiered.length > 0) return tiered[0];
  }
  return candidates[0];
}

function firstInCategory(
  pool: CatalogItem[],
  category: CatalogItem['category'],
  budget?: Budget,
): CatalogItem | undefined {
  const items = pool.filter((i) => i.category === category);
  if (budget) {
    const tiered = items.filter((i) => i.priceTier === budget);
    if (tiered.length > 0) return tiered[0];
  }
  return items[0];
}

function toGarment(item: CatalogItem, base: string): GarmentRef {
  return {
    garmentId: item.id,
    colorway: { base, pattern: 'solid', material: materialFor(item) },
    fit: item.fits.includes('regular') ? 'regular' : item.fits[0] ?? FITS[1],
    size: item.sizes[Math.floor(item.sizes.length / 2)] ?? item.sizes[0],
  };
}

function materialFor(item: CatalogItem): string {
  if (item.id.includes('denim') || item.id === 'jeans') return 'denim';
  if (item.id.includes('leather')) return 'leather';
  if (item.priceTier === 'premium') return 'silk';
  return 'cotton';
}

/** Pick a base color: user's preference, else a sensible default per occasion. */
function baseColor(input: SuggestRequest, slot: 'main' | 'accent'): string {
  if (input.colorPref) {
    try {
      const hex = normalizeHex(input.colorPref);
      // Use the preference for the main garment; accent gets a neutral pairing.
      if (slot === 'main') return hex;
      const named = nearestNamedColor(hex);
      return named.group === 'Neutrals' ? '#1E2A5A' : '#F5F5DC';
    } catch {
      // fall through to defaults
    }
  }
  const occasion = normalizeWord(input.occasion);
  if (slot === 'main') {
    if (occasion === 'formal' || occasion === 'business') return '#FFFFFF';
    if (occasion === 'party') return '#1E2A5A';
    if (occasion === 'athletic') return '#9AA0A6';
    return '#7FB3D5';
  }
  if (occasion === 'formal' || occasion === 'business') return '#36454F';
  return '#F5F5DC';
}

export function suggestOutfit(input: SuggestRequest): SuggestResponse {
  const personType: PersonType = input.personType;
  const isKid = personType === 'boy' || personType === 'girl';
  let pool = itemsFor(personType);
  if (isKid) pool = kidSafeOnly(pool); // non-negotiable

  const occasion = normalizeWord(input.occasion) || 'casual';
  const weather = normalizeWord(input.weather);
  const budget = input.budget;
  const notes: string[] = [];
  const outfit: Outfit = { accessories: [] };

  const canWearDresses = personType === 'woman' || personType === 'girl';
  const useDress =
    canWearDresses && DRESS_OCCASIONS.has(occasion) && pool.some((i) => i.category === 'dresses');

  if (useDress) {
    const dressIds = occasion === 'traditional' ? TRADITIONAL_DRESS : OCCASION_DRESS;
    const dress = pick(pool, dressIds, budget) ?? firstInCategory(pool, 'dresses', budget);
    if (dress) {
      outfit.dress = toGarment(dress, baseColor(input, 'main'));
      notes.push(`Dress: ${dress.name} for a ${occasion} occasion.`);
    }
  } else {
    const top = pick(pool, OCCASION_TOP[occasion] ?? OCCASION_TOP.casual, budget)
      ?? firstInCategory(pool, 'tops', budget);
    const bottom = pick(pool, OCCASION_BOTTOM[occasion] ?? OCCASION_BOTTOM.casual, budget)
      ?? firstInCategory(pool, 'bottoms', budget);
    if (top) {
      outfit.top = toGarment(top, baseColor(input, 'main'));
      notes.push(`Top: ${top.name}.`);
    }
    if (bottom) {
      outfit.bottom = toGarment(bottom, baseColor(input, 'accent'));
      notes.push(`Bottom: ${bottom.name}.`);
    }
  }

  if (weather.includes('cold') || weather.includes('winter') || weather.includes('chill')) {
    const outer = pick(pool, COLD_OUTERWEAR, budget) ?? firstInCategory(pool, 'outerwear', budget);
    if (outer) {
      outfit.outerwear = toGarment(outer, baseColor(input, 'accent'));
      notes.push(`Outerwear: ${outer.name} for cold weather.`);
    }
  } else if (weather.includes('cool') || weather.includes('breez') || weather.includes('rain')) {
    const outer = pick(pool, MILD_OUTERWEAR, budget) ?? firstInCategory(pool, 'outerwear', budget);
    if (outer) {
      outfit.outerwear = toGarment(outer, baseColor(input, 'accent'));
      notes.push(`Outerwear: ${outer.name} for ${weather} weather.`);
    }
  }

  const shoes = pick(pool, OCCASION_SHOES[occasion] ?? OCCASION_SHOES.casual, budget)
    ?? firstInCategory(pool, 'shoes', budget);
  if (shoes) {
    outfit.shoes = toGarment(shoes, '#36454F');
    notes.push(`Shoes: ${shoes.name}.`);
  }

  const accessoryIds =
    personType === 'woman' || personType === 'girl'
      ? ['necklace', 'earrings', 'bracelet', 'scarf', 'watch']
      : ['watch', 'belt', 'tie', 'sunglasses', 'cap'];
  const byId = new Map(pool.map((i) => [i.id, i]));
  for (const id of accessoryIds.slice(0, 2)) {
    const acc = byId.get(id);
    if (acc) outfit.accessories.push(toGarment(acc, '#C19A6B'));
  }
  if (outfit.accessories.length > 0) {
    notes.push(`Accessories: ${outfit.accessories.map((a) => itemById(a.garmentId)?.name ?? a.garmentId).join(', ')}.`);
  }

  if (isKid) notes.push('Kids-safe selection: only age-appropriate items.');
  if (budget) notes.push(`Budget tier: ${budget}.`);

  return { outfit, notes };
}
