/**
 * Shared domain types for Virtual Style Studio.
 * Consumed by both `server` and `client`. Keep this file free of
 * Node-only or browser-only APIs so it compiles in both worlds.
 */

/** Who is being styled. */
export type PersonType = 'man' | 'woman' | 'boy' | 'girl';

/** Age brackets used by the avatar builder and AI-person filters. */
export type AgeGroup = 'child' | 'teen' | 'adult';

export type Undertone = 'warm' | 'cool' | 'neutral';
export type Pose = 'front' | 'side' | 'three-quarter';

/** Parametric avatar configuration. Rendered by the client as layered SVG. */
export interface AvatarConfig {
  personType: PersonType;
  /** 1–12 step skin-tone scale (1 = lightest, 12 = deepest). */
  skinTone: number;
  undertone: Undertone;
  face: {
    shape: string;
    eyeShape: string;
    eyeColor: string;
    brows: string;
    nose: string;
    lips: string;
    facialHair?: string;
    makeup?: string;
  };
  hair: {
    color: string;
    length: string;
    texture: string;
    style: string;
  };
  body: {
    /** e.g. 'short' | 'average' | 'tall' */
    height: string;
    /** e.g. 'slim' | 'average' | 'athletic' | 'plus' */
    build: string;
    shoulder: string;
    waist: string;
    hips: string;
  };
  ageGroup: AgeGroup;
  pose?: Pose;
}

/** How a garment is rendered: flat color, pattern, and material. */
export interface Colorway {
  /** hex color, e.g. '#1a2b4c' */
  base: string;
  /** pattern id from PATTERNS */
  pattern: string;
  patternColor?: string;
  /** material id from MATERIALS */
  material: string;
}

/** A catalog garment plus the user's styling choices. */
export interface GarmentRef {
  /** catalog item id, e.g. 'men-tshirt' */
  garmentId: string;
  colorway: Colorway;
  /** fit id from FITS */
  fit?: string;
  /** size id from SIZES */
  size?: string;
}

/** A full outfit assembled from catalog garments. */
export interface Outfit {
  top?: GarmentRef;
  bottom?: GarmentRef;
  dress?: GarmentRef;
  outerwear?: GarmentRef;
  shoes?: GarmentRef;
  accessories: GarmentRef[];
}

/** The model the outfit is tried on. */
export interface ModelRef {
  kind: 'upload' | 'aiPerson' | 'avatar';
  /** UploadedImage id (upload) or GeneratedImage id/url (aiPerson). */
  id?: string;
  /** Public image URL for upload/aiPerson models. */
  imageUrl?: string;
  /** Present when kind === 'avatar'. Rendered by the client as SVG. */
  config?: AvatarConfig;
}

/** POST /api/tryon payload. */
export interface TryOnRequest {
  model: ModelRef;
  outfit: Outfit;
}

/** Async AI job lifecycle. */
export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface JobResult<T = unknown> {
  status: JobStatus;
  /** 0–100 */
  progress: number;
  result?: T;
  error?: string;
}

/** AI-generated person returned by POST /api/ai/people. */
export interface GeneratedPerson {
  url: string;
  /** Present for mock/preview providers. */
  label?: string;
  prompt?: string;
}

/** Try-on result returned when a provider job completes. */
export interface TryOnResult {
  url: string;
  label?: string;
}

/** POST /api/tryon responses. */
export type TryOnResponse =
  | { render: 'client'; spec: { model: ModelRef; outfit: Outfit } }
  | { render: 'server'; jobId: string };

/** POST /api/ai/people response. */
export interface PeopleJobResponse {
  jobId: string;
}

/** POST /api/outfits/suggest payload. */
export interface SuggestRequest {
  personType: PersonType;
  occasion?: string;
  weather?: string;
  style?: string;
  colorPref?: string;
  budget?: 'budget' | 'mid' | 'premium';
}

/** POST /api/outfits/suggest response. */
export interface SuggestResponse {
  outfit: Outfit;
  notes: string[];
}

/** GET /api/catalog response. */
export interface CatalogResponse {
  items: CatalogItem[];
  categories: CatalogCategory[];
}

/** A single garment in the shared catalog. */
export interface CatalogItem {
  id: string;
  name: string;
  category: CatalogCategory;
  personTypes: PersonType[];
  fits: string[];
  sizes: string[];
  /** Age-appropriate for kids; boy/girl suggestions are filtered to kidSafe items only. */
  kidSafe: boolean;
  /** Budget tier used by the outfit suggester. */
  priceTier: 'budget' | 'mid' | 'premium';
}

export type CatalogCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'indian'
  | 'outerwear'
  | 'shoes'
  | 'accessories';

/** Named color entry. */
export interface NamedColor {
  name: string;
  hex: string;
}

/** Palette groups, matching spec section 10 exactly. */
export type PaletteGroup =
  | 'Basics'
  | 'Reds'
  | 'Blues'
  | 'Greens'
  | 'Pinks'
  | 'Purples'
  | 'Yellow/Orange'
  | 'Neutrals';

export type ColorStyle =
  | 'pastel'
  | 'neon'
  | 'jewel'
  | 'earth'
  | 'muted'
  | 'warm'
  | 'cool'
  | 'metallic'
  | 'bright'
  | 'dark'
  | 'monochrome'
  | 'neutral';

/** Consistent API error envelope used by every server route. */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

/** Public user shape returned by auth endpoints. */
export interface PublicUser {
  id: string;
  email: string | null;
  isGuest: boolean;
  createdAt: string;
}
