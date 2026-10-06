import { describe, expect, it } from 'vitest';
import {
  categoriesFor,
  CLOTHING_ITEMS,
  itemById,
  itemsFor,
  kidSafeOnly,
} from '../src/catalog';
import type { PersonType } from '../src/types';

const PERSON_TYPES: PersonType[] = ['man', 'woman', 'boy', 'girl'];

describe('catalog shape', () => {
  it('has items for every person type across all core categories', () => {
    for (const pt of PERSON_TYPES) {
      const items = itemsFor(pt);
      expect(items.length, `${pt} has items`).toBeGreaterThan(0);
    }
    const cats = categoriesFor('woman');
    for (const c of ['tops', 'bottoms', 'dresses', 'indian', 'outerwear', 'shoes', 'accessories'] as const) {
      expect(cats, `woman has ${c}`).toContain(c);
    }
  });

  it('every item has a unique id and valid fields', () => {
    const ids = new Set<string>();
    for (const i of CLOTHING_ITEMS) {
      expect(i.id).toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(i.id), `duplicate id ${i.id}`).toBe(false);
      ids.add(i.id);
      expect(i.name.length).toBeGreaterThan(0);
      expect(i.personTypes.length).toBeGreaterThan(0);
      expect(i.fits.length).toBeGreaterThan(0);
      expect(i.sizes.length).toBeGreaterThan(0);
      expect(typeof i.kidSafe).toBe('boolean');
      expect(['budget', 'mid', 'premium']).toContain(i.priceTier);
    }
  });

  it('kids-only items use kids sizes, adult-only items use adult sizes', () => {
    const frock = itemById('frock')!;
    expect(frock.sizes).toContain('4-5Y');
    expect(frock.sizes).not.toContain('M');
    const blazer = itemById('blazer')!;
    expect(blazer.sizes).toContain('M');
    expect(blazer.sizes).not.toContain('4-5Y');
    const tshirt = itemById('tshirt')!;
    expect(tshirt.sizes).toContain('M');
    expect(tshirt.sizes).toContain('4-5Y');
  });

  it('itemsFor filters by category', () => {
    const dresses = itemsFor('woman', 'dresses');
    expect(dresses.length).toBeGreaterThan(0);
    expect(dresses.every((d) => d.category === 'dresses')).toBe(true);
    // men have no dresses in the catalog
    expect(itemsFor('man', 'dresses')).toHaveLength(0);
  });
});

describe('kidSafeOnly', () => {
  it('removes non-kidSafe items but keeps safe ones', () => {
    const kids = kidSafeOnly(itemsFor('girl'));
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.every((i) => i.kidSafe)).toBe(true);
    // the catalog deliberately contains non-kidSafe items visible to kids
    const all = itemsFor('girl');
    expect(all.some((i) => !i.kidSafe)).toBe(true);
    expect(kids.length).toBeLessThan(all.length);
  });

  it('boy suggestions never include heels or other adult-only items', () => {
    const safe = kidSafeOnly(itemsFor('boy', 'shoes'));
    expect(safe.find((i) => i.id === 'heels')).toBeUndefined();
  });
});
