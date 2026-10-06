import { describe, expect, it } from 'vitest';
import { itemById } from '@vss/shared';
import { suggestOutfit } from '../src/suggest';

describe('suggestOutfit', () => {
  it('produces a catalog-valid outfit for an occasion', () => {
    const { outfit, notes } = suggestOutfit({ personType: 'woman', occasion: 'formal' });
    expect(notes.length).toBeGreaterThan(0);
    const ids = [
      outfit.top?.garmentId,
      outfit.bottom?.garmentId,
      outfit.dress?.garmentId,
      outfit.shoes?.garmentId,
      ...outfit.accessories.map((a) => a.garmentId),
    ].filter(Boolean) as string[];
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const item = itemById(id);
      expect(item, `${id} is in the catalog`).toBeDefined();
      expect(item!.personTypes).toContain('woman');
    }
  });

  it('adds outerwear for cold weather', () => {
    const { outfit } = suggestOutfit({ personType: 'man', weather: 'cold winter' });
    expect(outfit.outerwear).toBeDefined();
    expect(itemById(outfit.outerwear!.garmentId)).toBeDefined();
  });

  it('omits outerwear for hot weather', () => {
    const { outfit } = suggestOutfit({ personType: 'man', weather: 'hot summer' });
    expect(outfit.outerwear).toBeUndefined();
  });

  it('honors budget tier when matching items exist', () => {
    const { outfit } = suggestOutfit({ personType: 'man', occasion: 'casual', budget: 'budget' });
    const main = outfit.top ?? outfit.bottom;
    expect(main).toBeDefined();
    expect(itemById(main!.garmentId)!.priceTier).toBe('budget');
  });

  it('uses colorPref for the main garment', () => {
    const { outfit } = suggestOutfit({ personType: 'woman', colorPref: '#ff0000' });
    const main = outfit.dress ?? outfit.top;
    expect(main?.colorway.base).toBe('#FF0000');
  });

  it('boy/girl suggestions only contain kidSafe items', () => {
    for (const personType of ['boy', 'girl'] as const) {
      const { outfit, notes } = suggestOutfit({ personType, occasion: 'party' });
      const ids = [
        outfit.top?.garmentId,
        outfit.bottom?.garmentId,
        outfit.dress?.garmentId,
        outfit.outerwear?.garmentId,
        outfit.shoes?.garmentId,
        ...outfit.accessories.map((a) => a.garmentId),
      ].filter(Boolean) as string[];
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(itemById(id)!.kidSafe, `${id} kidSafe for ${personType}`).toBe(true);
      }
      expect(notes.join(' ')).toContain('Kids-safe');
    }
  });

  it('is deterministic', () => {
    const input = { personType: 'woman' as const, occasion: 'business', weather: 'cool', budget: 'mid' as const };
    expect(suggestOutfit(input)).toEqual(suggestOutfit(input));
  });

  it('traditional occasion picks indian wear', () => {
    const { outfit } = suggestOutfit({ personType: 'woman', occasion: 'traditional' });
    const main = outfit.dress ?? outfit.top;
    expect(main).toBeDefined();
    expect(itemById(main!.garmentId)!.category).toBe('indian');
  });
});
