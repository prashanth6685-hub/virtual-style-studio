/**
 * AvatarConfig — the client's parametric avatar configuration.
 *
 * NOTE on @vss/shared: shared's `AvatarConfig` is a loose superset schema
 * (string fields) meant for opaque JSON storage. The client keeps this rich
 * structured version because the SVG renderer needs it (sliders, literal
 * unions, 1–12 skin scale). At API boundaries the config is cast to the
 * shared type — the JSON is identical in shape to what the server stores.
 */
import type { PersonType } from '@vss/shared';

export type SkinUndertone = 'warm' | 'cool' | 'neutral';

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'oblong';
export type EyeShape = 'almond' | 'round' | 'hooded' | 'monolid';
export type EyeColor = 'brown' | 'black' | 'hazel' | 'green' | 'blue' | 'gray';
export type BrowStyle = 'thin' | 'medium' | 'thick' | 'arched' | 'straight';
export type NoseShape = 'button' | 'straight' | 'wide' | 'pointed';
export type LipShape = 'full' | 'medium' | 'thin';
export type FacialHair = 'none' | 'stubble' | 'mustache' | 'goatee' | 'beard';
export type Makeup = 'none' | 'natural' | 'bold';

export interface FaceConfig {
  shape: FaceShape;
  eyeShape: EyeShape;
  eyeColor: EyeColor;
  brows: BrowStyle;
  nose: NoseShape;
  lips: LipShape;
  facialHair: FacialHair; // men only; forced 'none' for others
  makeup: Makeup; // women/girls; 'none' for men/boys
}

export type HairLength = 'short' | 'medium' | 'long';
export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily' | 'bald';
export type HairStyle =
  // man
  | 'buzz'
  | 'crew'
  | 'side-part'
  | 'curly-top'
  | 'fade'
  | 'man-bun'
  // woman
  | 'bob'
  | 'pixie'
  | 'ponytail'
  | 'bun'
  | 'braids'
  | 'afro'
  // boy
  | 'messy'
  // girl
  | 'pigtails'
  // shared long
  | 'long';

export interface HairConfig {
  color: string; // hex
  length: HairLength;
  texture: HairTexture;
  style: HairStyle;
}

export type BodyBuild = 'slim' | 'athletic' | 'average' | 'curvy' | 'plus';

export interface BodyConfig {
  height: number; // 0..1 slider
  build: BodyBuild;
  shoulder: number; // 0..1 slider
  waist: number; // 0..1 slider
  hips: number; // 0..1 slider
}

export type AgeGroup = 'child' | 'teen' | 'adult' | 'senior';

export interface AvatarConfig {
  personType: PersonType;
  /** 1–12 step skin-tone scale (1 = lightest, 12 = deepest), per shared contract. */
  skinTone: number;
  undertone: SkinUndertone;
  face: FaceConfig;
  hair: HairConfig;
  body: BodyConfig;
  ageGroup: AgeGroup;
  /** pose is presentation-only, never persisted as identity */
  pose?: AvatarPose;
}

export type AvatarPose = 'front' | 'side' | 'three-quarter';

/** 12-step skin tone scale, light → deep. */
export const SKIN_TONES: string[] = [
  '#ffead9',
  '#ffdfc2',
  '#f6cba6',
  '#eeb489',
  '#dda06f',
  '#c98a5c',
  '#a9744b',
  '#8a5a38',
  '#6e452b',
  '#54341f',
  '#3f2817',
  '#2b1c11',
];

export const HAIR_COLORS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#211d18' },
  { name: 'Dark brown', hex: '#3b2a1e' },
  { name: 'Brown', hex: '#5f4128' },
  { name: 'Auburn', hex: '#7c3f21' },
  { name: 'Red', hex: '#a83c1e' },
  { name: 'Blonde', hex: '#c99a4e' },
  { name: 'Gray', hex: '#9a9a98' },
  { name: 'Silver', hex: '#d8d8d6' },
  { name: 'White', hex: '#f2f1ee' },
];

export const EYE_COLOR_HEX: Record<EyeColor, string> = {
  brown: '#5a3a22',
  black: '#241d18',
  hazel: '#8a6b34',
  green: '#4a7c59',
  blue: '#4a7ca8',
  gray: '#7d8891',
};

export const HAIR_STYLES: Record<PersonType, { id: HairStyle; name: string }[]> = {
  man: [
    { id: 'buzz', name: 'Buzz' },
    { id: 'crew', name: 'Crew' },
    { id: 'fade', name: 'Fade' },
    { id: 'side-part', name: 'Side part' },
    { id: 'curly-top', name: 'Curly top' },
    { id: 'man-bun', name: 'Man bun' },
  ],
  woman: [
    { id: 'pixie', name: 'Pixie' },
    { id: 'bob', name: 'Bob' },
    { id: 'long', name: 'Long' },
    { id: 'ponytail', name: 'Ponytail' },
    { id: 'bun', name: 'Bun' },
    { id: 'braids', name: 'Braids' },
    { id: 'afro', name: 'Afro' },
  ],
  boy: [
    { id: 'buzz', name: 'Buzz' },
    { id: 'crew', name: 'Short' },
    { id: 'fade', name: 'Fade' },
    { id: 'messy', name: 'Messy' },
    { id: 'curly-top', name: 'Curly' },
    { id: 'side-part', name: 'Side part' },
  ],
  girl: [
    { id: 'pixie', name: 'Pixie' },
    { id: 'bob', name: 'Bob' },
    { id: 'long', name: 'Long' },
    { id: 'pigtails', name: 'Pigtails' },
    { id: 'braids', name: 'Braids' },
    { id: 'bun', name: 'Bun' },
    { id: 'afro', name: 'Afro' },
  ],
};
