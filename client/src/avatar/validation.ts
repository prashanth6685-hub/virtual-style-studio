import type { AvatarConfig } from './types';
import type { PersonType } from '@vss/shared';
import { SKIN_TONES, HAIR_STYLES } from './types';
import { defaultAvatarConfig } from './avatarDefaults';

const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'diamond', 'oblong'];
const EYE_SHAPES = ['almond', 'round', 'hooded', 'monolid'];
const EYE_COLORS = ['brown', 'black', 'hazel', 'green', 'blue', 'gray'];
const BROWS = ['thin', 'medium', 'thick', 'arched', 'straight'];
const NOSES = ['button', 'straight', 'wide', 'pointed'];
const LIPS = ['full', 'medium', 'thin'];
const FACIAL_HAIR = ['none', 'stubble', 'mustache', 'goatee', 'beard'];
const MAKEUP = ['none', 'natural', 'bold'];
const HAIR_LENGTHS = ['short', 'medium', 'long'];
const HAIR_TEXTURES = ['straight', 'wavy', 'curly', 'coily', 'bald'];
const BUILDS = ['slim', 'athletic', 'average', 'curvy', 'plus'];
const AGE_GROUPS = ['child', 'teen', 'adult', 'senior'];
const UNDERTONES = ['warm', 'cool', 'neutral'];

function inRange(n: unknown, min: number, max: number): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates an AvatarConfig. Enforces safety rules:
 * - kids (boy/girl) can never have facial hair and are always ageGroup child/teen
 * - makeup 'bold' is adult-only
 */
export function validateAvatarConfig(config: unknown): ValidationResult {
  const errors: string[] = [];
  if (!config || typeof config !== 'object') return { valid: false, errors: ['config must be an object'] };
  const c = config as Partial<AvatarConfig>;

  if (!['man', 'woman', 'boy', 'girl'].includes(c.personType as string))
    errors.push('personType must be man | woman | boy | girl');
  if (!Number.isInteger(c.skinTone) || (c.skinTone as number) < 1 || (c.skinTone as number) > SKIN_TONES.length)
    errors.push(`skinTone must be an integer 1..${SKIN_TONES.length}`);
  if (!UNDERTONES.includes(c.undertone as string)) errors.push('undertone must be warm | cool | neutral');

  const f = c.face as AvatarConfig['face'] | undefined;
  if (!f || typeof f !== 'object') errors.push('face is required');
  else {
    if (!FACE_SHAPES.includes(f.shape)) errors.push('face.shape invalid');
    if (!EYE_SHAPES.includes(f.eyeShape)) errors.push('face.eyeShape invalid');
    if (!EYE_COLORS.includes(f.eyeColor)) errors.push('face.eyeColor invalid');
    if (!BROWS.includes(f.brows)) errors.push('face.brows invalid');
    if (!NOSES.includes(f.nose)) errors.push('face.nose invalid');
    if (!LIPS.includes(f.lips)) errors.push('face.lips invalid');
    if (!FACIAL_HAIR.includes(f.facialHair)) errors.push('face.facialHair invalid');
    if (!MAKEUP.includes(f.makeup)) errors.push('face.makeup invalid');
  }

  const h = c.hair as AvatarConfig['hair'] | undefined;
  if (!h || typeof h !== 'object') errors.push('hair is required');
  else {
    if (typeof h.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(h.color)) errors.push('hair.color must be a #rrggbb hex');
    if (!HAIR_LENGTHS.includes(h.length)) errors.push('hair.length invalid');
    if (!HAIR_TEXTURES.includes(h.texture)) errors.push('hair.texture invalid');
    const allowed = (HAIR_STYLES[c.personType as keyof typeof HAIR_STYLES] ?? []).map((s) => s.id);
    if (!allowed.includes(h.style)) errors.push(`hair.style "${h.style}" not available for ${c.personType}`);
    if (h.texture === 'bald' && h.length !== 'short') errors.push('bald texture requires short length');
  }

  const b = c.body as AvatarConfig['body'] | undefined;
  if (!b || typeof b !== 'object') errors.push('body is required');
  else {
    if (!inRange(b.height, 0, 1)) errors.push('body.height must be 0..1');
    if (!BUILDS.includes(b.build)) errors.push('body.build invalid');
    if (!inRange(b.shoulder, 0, 1)) errors.push('body.shoulder must be 0..1');
    if (!inRange(b.waist, 0, 1)) errors.push('body.waist must be 0..1');
    if (!inRange(b.hips, 0, 1)) errors.push('body.hips must be 0..1');
  }

  if (!AGE_GROUPS.includes(c.ageGroup as string)) errors.push('ageGroup invalid');

  // Safety rules
  const isKid = c.personType === 'boy' || c.personType === 'girl';
  if (isKid && f && f.facialHair !== 'none') errors.push('kids cannot have facial hair');
  if (isKid && !['child', 'teen'].includes(c.ageGroup as string))
    errors.push('boy/girl avatars must use child or teen ageGroup');
  if (!isKid && ['child'].includes(c.ageGroup as string))
    errors.push('man/woman avatars cannot use child ageGroup');
  if (f && f.makeup === 'bold' && isKid) errors.push('bold makeup is adult-only');

  return { valid: errors.length === 0, errors };
}

/** Coerce an unknown value into a safe AvatarConfig, falling back to defaults. */
export function sanitizeAvatarConfig(raw: unknown, personType: PersonType = 'woman'): AvatarConfig {
  const fallback = defaultAvatarConfig(personType);
  const v = validateAvatarConfig(raw);
  if (v.valid) {
    const c = { ...(raw as AvatarConfig) };
    // hard safety clamps even on "valid" configs
    const isKid = c.personType === 'boy' || c.personType === 'girl';
    if (isKid) {
      c.face = { ...c.face, facialHair: 'none' };
      if (c.face.makeup === 'bold') c.face.makeup = 'natural';
    }
    return c;
  }
  return fallback;
}
