/**
 * Maps a parametric AvatarConfig to the neutral PersonFilters descriptors
 * consumed by AI person generation.
 *
 * Pure function — no network, no side effects. Produces ONLY neutral
 * appearance descriptors (skin tone 1–12, hair, build); nothing that labels
 * or stereotypes real-world groups. The server's prompt builder + safety
 * gate (`isSafePrompt`) still apply downstream.
 */
import type { AvatarConfig, PersonType } from './types';

/** Person-generation preference shape (mirrors the AI provider's PersonFilters). */
export interface PersonPrefs {
  personType: PersonType;
  ageGroup?: 'child' | 'teen' | 'adult';
  skinTone?: number;
  undertone?: 'warm' | 'cool' | 'neutral';
  hairColor?: string;
  hairStyle?: string;
  bodyType?: string;
  facialHair?: string;
}

/** Hex → neutral hair-color name (matches the avatar builder's palette). */
const HEX_TO_HAIR_NAME: Record<string, string> = {
  '#211d18': 'black',
  '#3b2a1e': 'dark brown',
  '#5f4128': 'brown',
  '#7c3f21': 'auburn',
  '#a83c1e': 'red',
  '#c99a4e': 'blonde',
  '#9a9a98': 'gray',
  '#d8d8d6': 'silver',
  '#f2f1ee': 'white',
};

const VALID_BUILDS = ['slim', 'athletic', 'average', 'curvy', 'plus'];
const VALID_UNDERTONES = ['warm', 'cool', 'neutral'];

function humanize(id: unknown): string | undefined {
  if (typeof id !== 'string') return undefined;
  const s = id.trim().replace(/[-_]+/g, ' ');
  return s ? s : undefined;
}

function hairColorName(color: unknown): string | undefined {
  if (typeof color !== 'string') return undefined;
  const c = color.trim().toLowerCase();
  if (!c) return undefined;
  if (c.startsWith('#')) return HEX_TO_HAIR_NAME[c];
  return c;
}

/**
 * Map the avatar config's hair settings to neutral descriptors.
 * 'bald' texture short-circuits to a shaved-head descriptor with no color.
 */
function hairDescriptors(
  hair: AvatarConfig['hair'] | undefined,
): { hairColor?: string; hairStyle?: string } {
  if (!hair || typeof hair !== 'object') return {};
  const texture = typeof hair.texture === 'string' ? hair.texture.trim().toLowerCase() : '';
  if (texture === 'bald') return { hairStyle: 'shaved head' };
  const style = humanize(hair.style);
  let hairStyle = style;
  if (style && (texture === 'curly' || texture === 'wavy' || texture === 'coily') && !style.includes(texture)) {
    hairStyle = `${texture} ${style}`;
  }
  return { hairColor: hairColorName(hair.color), hairStyle };
}

function skinToneNumber(tone: unknown): number | undefined {
  const n = typeof tone === 'number' ? tone : Number(tone);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(12, Math.max(1, Math.round(n)));
}

/**
 * Convert a parametric avatar config into AI person-generation preferences.
 * Missing/invalid fields are omitted (the prompt builder falls back to
 * neutral defaults); nothing here can produce a banned or stereotyping term.
 */
export function avatarConfigToPersonPrefs(config: AvatarConfig): PersonPrefs {
  const prefs: PersonPrefs = { personType: config.personType };

  // The client can send 'senior' at runtime even though the shared AgeGroup
  // type only lists child/teen/adult — normalize defensively.
  const ageRaw = config.ageGroup as string;
  const age = ageRaw === 'senior' ? 'adult' : ageRaw;
  if (age === 'child' || age === 'teen' || age === 'adult') prefs.ageGroup = age;

  const tone = skinToneNumber(config.skinTone);
  if (tone !== undefined) prefs.skinTone = tone;

  if (typeof config.undertone === 'string' && VALID_UNDERTONES.includes(config.undertone)) {
    prefs.undertone = config.undertone as PersonPrefs['undertone'];
  }

  const { hairColor, hairStyle } = hairDescriptors(config.hair);
  if (hairColor) prefs.hairColor = hairColor;
  if (hairStyle) prefs.hairStyle = hairStyle;

  const build = typeof config.body?.build === 'string' ? config.body.build.trim().toLowerCase() : '';
  if (VALID_BUILDS.includes(build)) prefs.bodyType = build;

  const fh = typeof config.face?.facialHair === 'string' ? config.face.facialHair.trim().toLowerCase() : '';
  if (config.personType === 'man' && fh && fh !== 'none') prefs.facialHair = fh.replace(/[-_]+/g, ' ');

  return prefs;
}
