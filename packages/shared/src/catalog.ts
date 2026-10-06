/**
 * Shared clothing catalog for Virtual Style Studio.
 *
 * Every item declares which person types it is offered for plus a `kidSafe`
 * flag. The outfit suggester and any kids' UI MUST filter boy/girl items
 * through {@link kidSafeOnly}.
 */
import { FITS, SIZES, SIZES_ADULT, SIZES_KIDS } from './colors';
import type { CatalogCategory, CatalogItem, PersonType } from './types';

type PriceTier = CatalogItem['priceTier'];

interface ItemOpts {
  kidSafe?: boolean;
  priceTier?: PriceTier;
  fits?: string[];
}

const KID_TYPES: PersonType[] = ['boy', 'girl'];

function sizesFor(personTypes: PersonType[]): string[] {
  const hasKid = personTypes.some((p) => KID_TYPES.includes(p));
  const hasAdult = personTypes.some((p) => !KID_TYPES.includes(p));
  if (hasKid && !hasAdult) return [...SIZES_KIDS];
  if (hasAdult && !hasKid) return [...SIZES_ADULT];
  return [...SIZES];
}

function item(
  id: string,
  name: string,
  category: CatalogCategory,
  personTypes: PersonType[],
  opts: ItemOpts = {},
): CatalogItem {
  return {
    id,
    name,
    category,
    personTypes,
    fits: opts.fits ?? [...FITS],
    sizes: sizesFor(personTypes),
    kidSafe: opts.kidSafe ?? true,
    priceTier: opts.priceTier ?? 'mid',
  };
}

export const CLOTHING_ITEMS: CatalogItem[] = [
  // ------------------------------ TOPS ------------------------------
  item('tshirt', 'Classic T-Shirt', 'tops', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget' }),
  item('polo', 'Polo Shirt', 'tops', ['man', 'woman', 'boy']),
  item('shirt', 'Casual Button-Down Shirt', 'tops', ['man', 'boy']),
  item('dress-shirt', 'Formal Dress Shirt', 'tops', ['man']),
  item('blouse', 'Blouse', 'tops', ['woman', 'girl']),
  item('tank-top', 'Tank Top', 'tops', ['man', 'woman'], { priceTier: 'budget' }),
  item('hoodie', 'Hoodie', 'tops', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget' }),
  item('sweater', 'Crewneck Sweater', 'tops', ['man', 'woman', 'boy', 'girl']),
  item('tunic', 'Tunic Top', 'tops', ['woman', 'girl']),
  item('henley', 'Henley Shirt', 'tops', ['man']),
  item('slogan-tee', 'Slogan Tee', 'tops', ['boy', 'girl'], { kidSafe: false, priceTier: 'budget' }),

  // ----------------------------- BOTTOMS -----------------------------
  item('jeans', 'Jeans', 'bottoms', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget' }),
  item('chinos', 'Chinos', 'bottoms', ['man', 'boy']),
  item('trousers', 'Formal Trousers', 'bottoms', ['man']),
  item('shorts', 'Shorts', 'bottoms', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget' }),
  item('joggers', 'Joggers', 'bottoms', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget' }),
  item('skirt', 'Skirt', 'bottoms', ['woman', 'girl']),
  item('leggings', 'Leggings', 'bottoms', ['woman', 'girl'], { priceTier: 'budget' }),
  item('palazzo', 'Palazzo Pants', 'bottoms', ['woman']),
  item('ripped-jeans', 'Ripped Jeans', 'bottoms', ['boy', 'girl'], { kidSafe: false, priceTier: 'budget' }),

  // ----------------------------- DRESSES -----------------------------
  item('casual-dress', 'Casual Dress', 'dresses', ['woman', 'girl'], { fits: ['slim', 'regular', 'relaxed'] }),
  item('maxi-dress', 'Maxi Dress', 'dresses', ['woman'], { fits: ['regular', 'relaxed'] }),
  item('sundress', 'Sundress', 'dresses', ['woman', 'girl'], { priceTier: 'budget', fits: ['regular', 'relaxed'] }),
  item('gown', 'Evening Gown', 'dresses', ['woman'], { priceTier: 'premium', fits: ['slim', 'regular'] }),
  item('shift-dress', 'Shift Dress', 'dresses', ['woman'], { fits: ['slim', 'regular'] }),
  item('frock', 'Girls Frock', 'dresses', ['girl'], { priceTier: 'budget', fits: ['regular', 'relaxed'] }),

  // --------------------------- INDIAN WEAR ---------------------------
  item('kurta', 'Kurta', 'indian', ['man', 'boy']),
  item('kurti', 'Kurti', 'indian', ['woman', 'girl']),
  item('sherwani', 'Sherwani', 'indian', ['man'], { priceTier: 'premium' }),
  item('saree', 'Saree', 'indian', ['woman'], { priceTier: 'premium' }),
  item('lehenga', 'Lehenga', 'indian', ['woman'], { priceTier: 'premium' }),
  item('salwar-suit', 'Salwar Suit', 'indian', ['woman', 'girl']),
  item('anarkali', 'Anarkali Dress', 'indian', ['woman', 'girl'], { priceTier: 'premium' }),
  item('dhoti-set', 'Dhoti Kurta Set', 'indian', ['man', 'boy']),
  item('nehru-jacket', 'Nehru Jacket', 'indian', ['man'], { priceTier: 'premium' }),

  // ---------------------------- OUTERWEAR ----------------------------
  item('denim-jacket', 'Denim Jacket', 'outerwear', ['man', 'woman', 'boy', 'girl']),
  item('blazer', 'Blazer', 'outerwear', ['man', 'woman'], { priceTier: 'premium' }),
  item('leather-jacket', 'Leather Jacket', 'outerwear', ['man', 'woman'], { priceTier: 'premium' }),
  item('parka', 'Parka', 'outerwear', ['man', 'woman', 'boy', 'girl']),
  item('cardigan', 'Cardigan', 'outerwear', ['woman', 'girl', 'boy']),
  item('windbreaker', 'Windbreaker', 'outerwear', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget' }),
  item('overcoat', 'Overcoat', 'outerwear', ['man', 'woman'], { priceTier: 'premium' }),
  item('shawl', 'Shawl', 'outerwear', ['woman', 'girl']),
  item('shrug', 'Shrug', 'outerwear', ['woman']),

  // ------------------------------ SHOES ------------------------------
  item('sneakers', 'Sneakers', 'shoes', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget', fits: ['regular', 'wide'] }),
  item('running-shoes', 'Running Shoes', 'shoes', ['man', 'woman', 'boy', 'girl'], { fits: ['regular', 'wide'] }),
  item('sandals', 'Sandals', 'shoes', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget', fits: ['regular', 'wide'] }),
  item('boots', 'Boots', 'shoes', ['man', 'woman', 'boy'], { fits: ['regular', 'wide'] }),
  item('loafers', 'Loafers', 'shoes', ['man', 'boy'], { fits: ['regular', 'wide'] }),
  item('formal-shoes', 'Formal Shoes', 'shoes', ['man'], { fits: ['regular', 'wide'] }),
  item('heels', 'Heels', 'shoes', ['woman'], { priceTier: 'premium', kidSafe: false, fits: ['regular'] }),
  item('flats', 'Ballet Flats', 'shoes', ['woman', 'girl'], { fits: ['regular', 'wide'] }),
  item('flip-flops', 'Flip-Flops', 'shoes', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget', fits: ['regular'] }),

  // ---------------------------- ACCESSORIES ---------------------------
  item('watch', 'Watch', 'accessories', ['man', 'woman', 'boy'], { fits: ['one-size'] }),
  item('sunglasses', 'Sunglasses', 'accessories', ['man', 'woman', 'boy', 'girl'], { fits: ['one-size'] }),
  item('cap', 'Cap', 'accessories', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget', fits: ['one-size'] }),
  item('hat', 'Sun Hat', 'accessories', ['woman', 'girl'], { fits: ['one-size'] }),
  item('belt', 'Belt', 'accessories', ['man', 'woman', 'boy'], { priceTier: 'budget', fits: ['one-size'] }),
  item('necklace', 'Necklace', 'accessories', ['woman', 'girl'], { fits: ['one-size'] }),
  item('earrings', 'Earrings', 'accessories', ['woman', 'girl'], { fits: ['one-size'] }),
  item('scarf', 'Scarf', 'accessories', ['man', 'woman', 'boy', 'girl'], { fits: ['one-size'] }),
  item('tie', 'Tie', 'accessories', ['man', 'boy'], { fits: ['one-size'] }),
  item('bow-tie', 'Bow Tie', 'accessories', ['man', 'boy'], { fits: ['one-size'] }),
  item('bracelet', 'Bracelet', 'accessories', ['woman', 'girl'], { priceTier: 'budget', fits: ['one-size'] }),
  item('backpack', 'Backpack', 'accessories', ['man', 'woman', 'boy', 'girl'], { priceTier: 'budget', fits: ['one-size'] }),
  item('handbag', 'Handbag', 'accessories', ['woman'], { priceTier: 'premium', fits: ['one-size'] }),
  item('hairband', 'Hairband', 'accessories', ['girl'], { priceTier: 'budget', fits: ['one-size'] }),
];

/** Items offered for a person type, optionally narrowed to one category. */
export function itemsFor(personType: PersonType, category?: CatalogCategory): CatalogItem[] {
  return CLOTHING_ITEMS.filter(
    (i) => i.personTypes.includes(personType) && (!category || i.category === category),
  );
}

/** Keep only age-appropriate items. REQUIRED for boy/girl suggestions and kids' UI. */
export function kidSafeOnly(items: CatalogItem[]): CatalogItem[] {
  return items.filter((i) => i.kidSafe);
}

/** Look up a single catalog item by id. */
export function itemById(id: string): CatalogItem | undefined {
  return CLOTHING_ITEMS.find((i) => i.id === id);
}

/** Categories that have at least one item for the given person type. */
export function categoriesFor(personType: PersonType): CatalogCategory[] {
  const seen = new Set<CatalogCategory>();
  for (const i of CLOTHING_ITEMS) {
    if (i.personTypes.includes(personType)) seen.add(i.category);
  }
  return [...seen];
}
