import type { GarmentRef, Outfit } from '@vss/shared';

export type OutfitSlot = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes';

export const EMPTY_OUTFIT: Outfit = { accessories: [] };

export type OutfitAction =
  | { type: 'SET_SLOT'; slot: OutfitSlot; item: GarmentRef | null }
  | { type: 'ADD_ACCESSORY'; item: GarmentRef }
  | { type: 'REMOVE_ACCESSORY'; garmentId: string }
  | { type: 'UPDATE_ITEM'; slot: OutfitSlot | 'accessory'; garmentId: string; patch: Partial<GarmentRef> }
  | { type: 'CLEAR' }
  | { type: 'REPLACE'; outfit: Outfit };

/**
 * Pure outfit-builder transitions.
 * - Setting a dress clears top+bottom; setting top/bottom clears dress.
 * - Accessories are a keyed list (one per garment id).
 */
export function outfitReducer(state: Outfit, action: OutfitAction): Outfit {
  switch (action.type) {
    case 'SET_SLOT': {
      const next: Outfit = { ...state, accessories: state.accessories ?? [] };
      if (action.slot === 'dress') {
        next.dress = action.item ?? undefined;
        if (action.item) {
          next.top = undefined;
          next.bottom = undefined;
        }
      } else {
        next[action.slot] = action.item ?? undefined;
        if (action.item && (action.slot === 'top' || action.slot === 'bottom')) {
          next.dress = undefined;
        }
      }
      return next;
    }
    case 'ADD_ACCESSORY': {
      const rest = (state.accessories ?? []).filter((a) => a.garmentId !== action.item.garmentId);
      return { ...state, accessories: [...rest, action.item] };
    }
    case 'REMOVE_ACCESSORY':
      return { ...state, accessories: (state.accessories ?? []).filter((a) => a.garmentId !== action.garmentId) };
    case 'UPDATE_ITEM': {
      if (action.slot === 'accessory') {
        return {
          ...state,
          accessories: (state.accessories ?? []).map((a) =>
            a.garmentId === action.garmentId ? { ...a, ...action.patch } : a,
          ),
        };
      }
      const current = state[action.slot];
      if (!current || current.garmentId !== action.garmentId) return state;
      return { ...state, [action.slot]: { ...current, ...action.patch } };
    }
    case 'CLEAR':
      return { accessories: [] };
    case 'REPLACE':
      return { ...action.outfit, accessories: action.outfit.accessories ?? [] };
    default:
      return state;
  }
}

/** Count of distinct pieces in an outfit (for badges/empty states). */
export function outfitPieceCount(outfit: Outfit): number {
  let n = (outfit.accessories ?? []).length;
  for (const slot of ['top', 'bottom', 'dress', 'outerwear', 'shoes'] as const) {
    if (outfit[slot]) n += 1;
  }
  return n;
}
