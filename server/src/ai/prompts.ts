/**
 * Safety-first prompt builder for AI image generation.
 *
 * Non-negotiable rules enforced here:
 * - Every generated person is fully clothed and modest, NEVER sexualized.
 * - Children (boy/girl) get modest everyday children's clothing only.
 * - Only neutral appearance descriptors (skin tone, hair, build) — no
 *   stereotyping or labeling of real-world groups.
 *
 * `isSafePrompt` is the testable gate: providers MUST call it on the final
 * prompt before sending it anywhere.
 */
import type { PersonFilters } from './types';

/** Terms that must never appear in a generated prompt or pass the gate. */
export const BANNED_TERMS = [
  // sexualized
  'sexy', 'sexual', 'sexualized', 'nude', 'naked', 'lingerie', 'bikini',
  'cleavage', 'seductive', 'sensual', 'erotic', 'striptease', 'stripping',
  'underwear model', 'fetish', 'provocative', 'suggestive', 'topless',
  // stereotyping / labeling
  'exotic', 'tribal', 'oriental', 'ghetto', 'redneck', 'bimbo', 'bimbofication',
];

/** Phrases that must appear in every person prompt. */
export const MODESTY_PHRASES = [
  'fully clothed',
  'modest',
  'non-sexualized',
];

const SKIN_TONE_WORDS: Record<number, string> = {
  1: 'very fair', 2: 'fair', 3: 'light', 4: 'light-medium', 5: 'medium',
  6: 'medium-tan', 7: 'tan', 8: 'brown', 9: 'deep brown', 10: 'dark brown',
  11: 'very dark brown', 12: 'deepest ebony',
};

function skinDescriptor(filters: PersonFilters): string {
  if (filters.skinTone && SKIN_TONE_WORDS[filters.skinTone]) {
    return `${SKIN_TONE_WORDS[filters.skinTone]} skin`;
  }
  return 'natural skin tone';
}

function ageWord(filters: PersonFilters): string {
  const isKid = filters.personType === 'boy' || filters.personType === 'girl';
  if (isKid) return 'child';
  if (filters.ageGroup === 'teen') return 'teenager';
  return 'adult';
}

function personWord(filters: PersonFilters): string {
  switch (filters.personType) {
    case 'man': return 'man';
    case 'woman': return 'woman';
    case 'boy': return 'boy';
    case 'girl': return 'girl';
  }
}

/** Build a text-to-image prompt for an AI person. Always modest. */
export function buildPersonPrompt(filters: PersonFilters): string {
  const isKid = filters.personType === 'boy' || filters.personType === 'girl';
  const parts: string[] = [
    `Full-body studio portrait of a ${ageWord(filters)} ${personWord(filters)}`,
    skinDescriptor(filters),
    filters.hairColor ? `${filters.hairColor} hair` : 'natural hair',
    filters.hairStyle ? `${filters.hairStyle} hairstyle` : 'neat hairstyle',
    ...(filters.facialHair ? [`with ${filters.facialHair} facial hair`] : []),
    filters.bodyType ? `${filters.bodyType} build` : 'average build',
    isKid
      ? 'wearing modest everyday children\'s clothing (t-shirt and jeans)'
      : 'wearing modest everyday clothing (shirt and trousers)',
    'standing pose, neutral light-gray studio background',
    'photorealistic, fully clothed, modest, non-sexualized',
  ];
  return parts.join(', ');
}

/** Build an image-edit prompt describing the outfit to put on the model. */
export function buildTryOnPrompt(outfit: {
  top?: { garmentId: string; colorway: { base: string; pattern: string; material: string } };
  bottom?: { garmentId: string; colorway: { base: string; pattern: string; material: string } };
  dress?: { garmentId: string; colorway: { base: string; pattern: string; material: string } };
  outerwear?: { garmentId: string; colorway: { base: string; pattern: string; material: string } };
  shoes?: { garmentId: string; colorway: { base: string; pattern: string; material: string } };
  accessories: { garmentId: string }[];
}): string {
  const describe = (g: { garmentId: string; colorway: { base: string; pattern: string; material: string } }) =>
    `${g.garmentId.replace(/-/g, ' ')} in ${g.colorway.base} (${g.colorway.pattern} pattern, ${g.colorway.material})`;
  const pieces: string[] = [];
  if (outfit.dress) pieces.push(describe(outfit.dress));
  else {
    if (outfit.top) pieces.push(describe(outfit.top));
    if (outfit.bottom) pieces.push(describe(outfit.bottom));
  }
  if (outfit.outerwear) pieces.push(describe(outfit.outerwear));
  if (outfit.shoes) pieces.push(describe(outfit.shoes));
  for (const a of outfit.accessories) pieces.push(a.garmentId.replace(/-/g, ' '));
  return (
    `Dress the person in this exact outfit: ${pieces.join('; ') || 'casual everyday clothing'}. ` +
    `Keep the person's face, identity, pose, and background unchanged. ` +
    `Fully clothed, modest, non-sexualized, photorealistic fashion photography.`
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safety gate: returns false if the prompt contains any banned
 * (sexualized or stereotyping) term.
 *
 * Terms match as whole words, where hyphens count as word characters —
 * so our own safety phrase "non-sexualized" passes, while standalone
 * "sexual" / "sexualized" are still rejected.
 */
export function isSafePrompt(prompt: string): boolean {
  return !BANNED_TERMS.some((term) =>
    new RegExp(`(?<![\\w-])${escapeRegExp(term)}(?![\\w-])`, 'i').test(prompt),
  );
}
