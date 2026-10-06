import { describe, expect, it } from 'vitest';
import { outfitReducer, outfitPieceCount, EMPTY_OUTFIT, type OutfitSlot } from '../state/outfit';
import type { GarmentRef, Outfit } from '@vss/shared';

function item(garmentId: string, base = '#ffffff'): GarmentRef {
  return { garmentId, colorway: { base, pattern: 'solid', material: 'cotton' }, fit: 'regular', size: 'M' };
}

function setSlot(slot: OutfitSlot, garmentId: string | null) {
  return outfitReducer(EMPTY_OUTFIT, {
    type: 'SET_SLOT',
    slot,
    item: garmentId ? item(garmentId) : null,
  });
}

describe('outfit builder state transitions', () => {
  it('sets and clears a slot', () => {
    let s = setSlot('top', 'tshirt');
    expect(s.top?.garmentId).toBe('tshirt');
    s = outfitReducer(s, { type: 'SET_SLOT', slot: 'top', item: null });
    expect(s.top).toBeUndefined();
  });

  it('setting a dress clears top and bottom', () => {
    let s = setSlot('top', 'tshirt');
    s = outfitReducer(s, { type: 'SET_SLOT', slot: 'bottom', item: item('jeans') });
    s = outfitReducer(s, { type: 'SET_SLOT', slot: 'dress', item: item('casual-dress') });
    expect(s.dress?.garmentId).toBe('casual-dress');
    expect(s.top).toBeUndefined();
    expect(s.bottom).toBeUndefined();
  });

  it('setting top or bottom clears a dress', () => {
    let s = outfitReducer(EMPTY_OUTFIT, { type: 'SET_SLOT', slot: 'dress', item: item('casual-dress') });
    s = outfitReducer(s, { type: 'SET_SLOT', slot: 'top', item: item('tshirt') });
    expect(s.dress).toBeUndefined();
    expect(s.top?.garmentId).toBe('tshirt');
  });

  it('accessories are keyed by garment id (re-adding replaces)', () => {
    let s = outfitReducer(EMPTY_OUTFIT, { type: 'ADD_ACCESSORY', item: item('watch', '#000000') });
    s = outfitReducer(s, { type: 'ADD_ACCESSORY', item: item('watch', '#ffffff') });
    expect(s.accessories).toHaveLength(1);
    expect(s.accessories[0].colorway.base).toBe('#ffffff');
    s = outfitReducer(s, { type: 'REMOVE_ACCESSORY', garmentId: 'watch' });
    expect(s.accessories).toHaveLength(0);
  });

  it('UPDATE_ITEM patches colorway without touching other fields', () => {
    let s = setSlot('shoes', 'sneakers');
    s = outfitReducer(s, {
      type: 'UPDATE_ITEM',
      slot: 'shoes',
      garmentId: 'sneakers',
      patch: { colorway: { base: '#ff0000', pattern: 'stripes', material: 'leather' } },
    });
    expect(s.shoes?.colorway.base).toBe('#ff0000');
    expect(s.shoes?.fit).toBe('regular');
  });

  it('UPDATE_ITEM ignores mismatched garment ids', () => {
    const s = setSlot('top', 'tshirt');
    const next = outfitReducer(s, {
      type: 'UPDATE_ITEM',
      slot: 'top',
      garmentId: 'hoodie',
      patch: { fit: 'oversized' },
    });
    expect(next).toBe(s);
  });

  it('CLEAR empties everything and REPLACE swaps wholesale', () => {
    let s = setSlot('top', 'tshirt');
    s = outfitReducer(s, { type: 'ADD_ACCESSORY', item: item('cap') });
    s = outfitReducer(s, { type: 'CLEAR' });
    expect(outfitPieceCount(s)).toBe(0);

    const replacement: Outfit = {
      dress: item('maxi-dress'),
      shoes: item('heels'),
      accessories: [item('necklace')],
    };
    s = outfitReducer(s, { type: 'REPLACE', outfit: replacement });
    expect(outfitPieceCount(s)).toBe(3);
    expect(s.dress?.garmentId).toBe('maxi-dress');
  });

  it('outfitPieceCount counts slots + accessories', () => {
    const s: Outfit = {
      top: item('tshirt'),
      shoes: item('sneakers'),
      accessories: [item('watch'), item('cap')],
    };
    expect(outfitPieceCount(s)).toBe(4);
    expect(outfitPieceCount(EMPTY_OUTFIT)).toBe(0);
  });
});
