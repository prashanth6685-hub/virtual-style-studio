/**
 * Client catalog helpers — bridge between the shared catalog (`@vss/shared`)
 * and the parametric SVG garment renderer (`src/avatar/garments.tsx`).
 *
 * The renderer covers the brief's MVP garment set. Shared catalog items that
 * have no renderer mapping yet (e.g. sherwani, lehenga, gown, backpack) are
 * excluded from the studio picker — wiring them up is a Phase 2 extension
 * point; the mapping table below is where new renderers get registered.
 */
import {
  itemsFor,
  itemById,
  kidSafeOnly,
  type CatalogItem,
  type Colorway,
  type PersonType,
} from '@vss/shared';
import { GARMENT_NAMES, garmentLayer, garmentTab } from '../avatar/garments';

/** Shared catalog id → renderer garment id. */
export const CATALOG_TO_RENDER: Record<string, string> = {
  tshirt: 'tshirt',
  polo: 'polo',
  shirt: 'shirt',
  blouse: 'blouse',
  'tank-top': 'tanktop',
  hoodie: 'hoodie',
  sweater: 'sweater',
  kurta: 'kurta',
  kurti: 'kurta',
  jeans: 'jeans',
  chinos: 'chinos',
  shorts: 'shorts',
  skirt: 'skirt',
  leggings: 'leggings',
  'casual-dress': 'dress-casual',
  'maxi-dress': 'dress-maxi',
  saree: 'dress-saree',
  blazer: 'blazer',
  'denim-jacket': 'jacket',
  sneakers: 'sneakers',
  heels: 'heels',
  sandals: 'sandals',
  boots: 'boots',
  watch: 'watch',
  sunglasses: 'sunglasses',
  cap: 'cap',
  hat: 'hat',
  belt: 'belt',
  necklace: 'necklace',
  earrings: 'earrings',
  scarf: 'scarf',
  tie: 'tie',
};

/** Resolve any id (catalog or renderer) to the renderer garment id. */
export function toRenderId(id: string): string {
  return CATALOG_TO_RENDER[id] ?? id;
}

export function isRenderable(catalogId: string): boolean {
  return catalogId in CATALOG_TO_RENDER;
}

/**
 * Catalog items offered in the studio picker for a person type:
 * person-type filtered, kid-safe for boy/girl, and renderer-backed.
 */
export function renderableCatalog(personType: PersonType): CatalogItem[] {
  const items = itemsFor(personType);
  const safe = personType === 'boy' || personType === 'girl' ? kidSafeOnly(items) : items;
  return safe.filter((i) => isRenderable(i.id));
}

/** Display name for a catalog (or renderer) garment id. */
export function garmentDisplayName(id: string): string {
  return itemById(id)?.name ?? GARMENT_NAMES[toRenderId(id)] ?? id;
}

/** Studio tab for a catalog garment id. */
export function tabForCatalogId(id: string): string {
  return garmentTab(toRenderId(id));
}

/** SVG layer for a catalog garment id. */
export function layerForCatalogId(id: string): ReturnType<typeof garmentLayer> {
  return garmentLayer(toRenderId(id));
}

/** Sensible starter base colors, keyed by renderer garment id. */
export const DEFAULT_BASE: Record<string, string> = {
  tshirt: '#FFFFFF',
  polo: '#1E2A5A',
  shirt: '#F7F6F4',
  hoodie: '#9AA0A6',
  kurta: '#FFF8E7',
  blouse: '#F9C5D5',
  tanktop: '#F7F6F4',
  sweater: '#8B5E3C',
  jeans: '#3B5B7E',
  chinos: '#C3B091',
  shorts: '#1E2A5A',
  skirt: '#000000',
  leggings: '#000000',
  'dress-casual': '#FF7F50',
  'dress-maxi': '#2E5AAC',
  'dress-saree': '#DC143C',
  blazer: '#1E2A5A',
  jacket: '#3B5B7E',
  sneakers: '#F7F6F4',
  heels: '#000000',
  sandals: '#8B5E3C',
  boots: '#5C4033',
  watch: '#4A4A4A',
  sunglasses: '#23272E',
  cap: '#DC143C',
  hat: '#FFF8E7',
  belt: '#5C4033',
  necklace: '#D4A017',
  earrings: '#D4A017',
  scarf: '#CB4335',
  tie: '#800000',
};

export function defaultColorwayFor(catalogId: string): Colorway {
  return {
    base: DEFAULT_BASE[toRenderId(catalogId)] ?? '#9AA0A6',
    pattern: 'solid',
    material: 'cotton',
  };
}

/** Pattern options the SVG renderer supports (subset of shared PATTERNS). */
export const RENDER_PATTERNS = [
  { id: 'solid', label: 'Solid' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'dots', label: 'Dots' },
  { id: 'plaid', label: 'Plaid' },
] as const;

export type RenderPatternId = (typeof RENDER_PATTERNS)[number]['id'];

export const MATERIALS = [
  'cotton',
  'denim',
  'linen',
  'silk',
  'wool',
  'polyester',
  'leather',
  'velvet',
  'chiffon',
  'knit',
  'satin',
  'corduroy',
] as const;
