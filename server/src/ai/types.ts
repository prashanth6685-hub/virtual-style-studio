/**
 * AI provider interface. Every provider implements text-to-image person
 * generation, image-to-image try-on, and (optionally) person detection.
 *
 * `detectPerson` returns GEOMETRY ONLY (bounding box). It must NEVER infer
 * or label sensitive attributes of a real person (age, gender, ethnicity,
 * emotions, etc.).
 */
import type { ModelRef, Outfit } from '@vss/shared';

/** Error thrown by providers. Surfaces as {error:{code:'PROVIDER_ERROR'}}. */
export class ProviderError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'PROVIDER_ERROR', status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface PersonFilters {
  personType: 'man' | 'woman' | 'boy' | 'girl';
  ageGroup?: 'child' | 'teen' | 'adult';
  skinTone?: number;
  undertone?: 'warm' | 'cool' | 'neutral';
  hairColor?: string;
  hairStyle?: string;
  bodyType?: string;
  /** e.g. 'goatee' | 'beard' — men only; prompt stays neutral. */
  facialHair?: string;
}

export interface GeneratedPerson {
  url: string;
  /** Set for preview/mock results. */
  label?: string;
}

export interface TryOnInput {
  model: ModelRef;
  outfit: Outfit;
  /** Publicly reachable URL of the model's photo. */
  modelImageUrl: string;
}

export interface TryOnOutput {
  url: string;
  label?: string;
}

/** Geometry-only person detection result. */
export interface PersonDetection {
  /** [x, y, width, height] as fractions of the image, 0–1. */
  bbox: [number, number, number, number];
}

export interface AIProvider {
  /** Provider name, e.g. 'pollinations'. */
  name(): string;
  generatePerson(filters: PersonFilters): Promise<GeneratedPerson>;
  tryOn(input: TryOnInput): Promise<TryOnOutput>;
  detectPerson(imageUrl: string): Promise<PersonDetection>;
}
