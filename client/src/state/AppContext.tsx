import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { GarmentRef, ModelRef, Outfit, PersonType } from '@vss/shared';
import type { AvatarConfig as SharedAvatarConfig } from '@vss/shared';
import type { AvatarConfig } from '../avatar/types';
import { sanitizeAvatarConfig } from '../avatar/validation';
import { outfitReducer, EMPTY_OUTFIT, type OutfitSlot } from './outfit';
import { me as apiMe, type PublicUser } from '../lib/api';

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface AppContextValue {
  personType: PersonType;
  setPersonType: (pt: PersonType) => void;
  model: ModelRef | null;
  setModel: (m: ModelRef | null) => void;
  outfit: Outfit;
  setSlot: (slot: OutfitSlot, item: GarmentRef | null) => void;
  addAccessory: (item: GarmentRef) => void;
  removeAccessory: (garmentId: string) => void;
  updateItem: (slot: OutfitSlot | 'accessory', garmentId: string, patch: Partial<GarmentRef>) => void;
  clearOutfit: () => void;
  replaceOutfit: (o: Outfit) => void;
  toasts: Toast[];
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  user: PublicUser | null;
  setUser: (u: PublicUser | null) => void;
  authChecked: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const LS_PERSON = 'vss:personType';
const LS_MODEL = 'vss:model';

function loadPersonType(): PersonType {
  try {
    const v = localStorage.getItem(LS_PERSON);
    if (v === 'man' || v === 'woman' || v === 'boy' || v === 'girl') return v;
  } catch {
    /* ignore */
  }
  return 'woman';
}

/**
 * The avatar config in a persisted ModelRef is cast to the shared (loose)
 * AvatarConfig at the API boundary; here we sanitize it back into the rich
 * client-side parametric config.
 */
function loadModel(): ModelRef | null {
  try {
    const raw = localStorage.getItem(LS_MODEL);
    if (!raw) return null;
    const m = JSON.parse(raw) as ModelRef;
    if (!m || (m.kind !== 'upload' && m.kind !== 'aiPerson' && m.kind !== 'avatar')) return null;
    if (m.kind === 'avatar' && m.config) {
      m.config = sanitizeAvatarConfig(m.config, 'woman') as unknown as SharedAvatarConfig;
    }
    return m;
  } catch {
    return null;
  }
}

/** Build a ModelRef for an avatar model (casts the rich config to shared shape). */
export function avatarModelRef(config: AvatarConfig): ModelRef {
  return { kind: 'avatar', config: config as unknown as SharedAvatarConfig };
}

/** Read the rich avatar config back out of a ModelRef. */
export function avatarConfigOf(model: ModelRef | null): AvatarConfig | undefined {
  if (model?.kind === 'avatar' && model.config) return model.config as unknown as AvatarConfig;
  return undefined;
}

let toastId = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [personType, setPersonTypeState] = useState<PersonType>(loadPersonType);
  const [model, setModelState] = useState<ModelRef | null>(loadModel);
  const [outfit, dispatch] = useReducer(outfitReducer, EMPTY_OUTFIT);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // persist personType + model
  useEffect(() => {
    try {
      localStorage.setItem(LS_PERSON, personType);
    } catch {
      /* ignore */
    }
  }, [personType]);
  useEffect(() => {
    try {
      if (model) localStorage.setItem(LS_MODEL, JSON.stringify(model));
      else localStorage.removeItem(LS_MODEL);
    } catch {
      /* ignore */
    }
  }, [model]);

  // check session on boot (non-blocking; failures just mean logged out)
  useEffect(() => {
    let alive = true;
    apiMe()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch(() => {
        /* not logged in */
      })
      .finally(() => {
        if (alive) setAuthChecked(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: Toast['kind'] = 'info') => {
      const id = toastId++;
      setToasts((t) => [...t.slice(-2), { id, message, kind }]);
      setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const setPersonType = useCallback((pt: PersonType) => setPersonTypeState(pt), []);
  const setModel = useCallback((m: ModelRef | null) => setModelState(m), []);
  const setSlot = useCallback(
    (slot: OutfitSlot, item: GarmentRef | null) => dispatch({ type: 'SET_SLOT', slot, item }),
    [],
  );
  const addAccessory = useCallback((item: GarmentRef) => dispatch({ type: 'ADD_ACCESSORY', item }), []);
  const removeAccessory = useCallback(
    (garmentId: string) => dispatch({ type: 'REMOVE_ACCESSORY', garmentId }),
    [],
  );
  const updateItem = useCallback(
    (slot: OutfitSlot | 'accessory', garmentId: string, patch: Partial<GarmentRef>) =>
      dispatch({ type: 'UPDATE_ITEM', slot, garmentId, patch }),
    [],
  );
  const clearOutfit = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const replaceOutfit = useCallback((o: Outfit) => dispatch({ type: 'REPLACE', outfit: o }), []);

  const value = useMemo<AppContextValue>(
    () => ({
      personType,
      setPersonType,
      model,
      setModel,
      outfit,
      setSlot,
      addAccessory,
      removeAccessory,
      updateItem,
      clearOutfit,
      replaceOutfit,
      toasts,
      toast,
      dismissToast,
      user,
      setUser,
      authChecked,
    }),
    [
      personType,
      setPersonType,
      model,
      setModel,
      outfit,
      setSlot,
      addAccessory,
      removeAccessory,
      updateItem,
      clearOutfit,
      replaceOutfit,
      toasts,
      toast,
      dismissToast,
      user,
      authChecked,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
