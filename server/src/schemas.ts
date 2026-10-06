/**
 * Zod validation schemas for every API input. Used via `validate()`.
 */
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from './middleware/errors';

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const personTypeSchema = z.enum(['man', 'woman', 'boy', 'girl']);

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
});

const colorwaySchema = z.object({
  base: z.string().regex(HEX_RE, 'base must be a hex color like #1a2b4c'),
  pattern: z.string().min(1).max(40),
  patternColor: z.string().regex(HEX_RE, 'patternColor must be a hex color').optional(),
  material: z.string().min(1).max(40),
});

const garmentRefSchema = z.object({
  garmentId: z.string().min(1).max(80),
  colorway: colorwaySchema,
  fit: z.string().max(40).optional(),
  size: z.string().max(20).optional(),
});

export const outfitSchema = z.object({
  top: garmentRefSchema.optional(),
  bottom: garmentRefSchema.optional(),
  dress: garmentRefSchema.optional(),
  outerwear: garmentRefSchema.optional(),
  shoes: garmentRefSchema.optional(),
  accessories: z.array(garmentRefSchema).max(12).default([]),
});

const avatarConfigSchema = z.object({
  personType: personTypeSchema,
  skinTone: z.number().int().min(1).max(12),
  undertone: z.enum(['warm', 'cool', 'neutral']),
  face: z.object({
    shape: z.string().max(40),
    eyeShape: z.string().max(40),
    eyeColor: z.string().max(40),
    brows: z.string().max(40),
    nose: z.string().max(40),
    lips: z.string().max(40),
    facialHair: z.string().max(40).optional(),
    makeup: z.string().max(40).optional(),
  }),
  hair: z.object({
    color: z.string().max(40),
    length: z.string().max(40),
    texture: z.string().max(40),
    style: z.string().max(40),
  }),
  body: z.object({
    height: z.string().max(40),
    build: z.string().max(40),
    shoulder: z.string().max(40),
    waist: z.string().max(40),
    hips: z.string().max(40),
  }),
  ageGroup: z.enum(['child', 'teen', 'adult']),
  pose: z.enum(['front', 'side', 'three-quarter']).optional(),
});

export const modelRefSchema = z.object({
  kind: z.enum(['upload', 'aiPerson', 'avatar']),
  id: z.string().max(80).optional(),
  imageUrl: z.string().url('imageUrl must be a valid URL').max(2048).optional(),
  config: avatarConfigSchema.optional(),
});

export const tryOnSchema = z.object({
  model: modelRefSchema,
  outfit: outfitSchema,
});

export const peopleSchema = z.object({
  filters: z
    .object({
      personType: personTypeSchema,
      ageGroup: z.enum(['child', 'teen', 'adult']).optional(),
      skinTone: z.number().int().min(1).max(12).optional(),
      undertone: z.enum(['warm', 'cool', 'neutral']).optional(),
      hairColor: z.string().max(40).optional(),
      hairStyle: z.string().max(40).optional(),
      bodyType: z.string().max(40).optional(),
    })
    .default({ personType: 'woman' as const }),
  count: z.number().int().min(1).max(8).default(8),
});

export const suggestSchema = z.object({
  personType: personTypeSchema,
  occasion: z.string().max(60).optional(),
  weather: z.string().max(60).optional(),
  style: z.string().max(60).optional(),
  colorPref: z.string().regex(HEX_RE, 'colorPref must be a hex color like #1a2b4c').optional(),
  budget: z.enum(['budget', 'mid', 'premium']).optional(),
});

export const avatarBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  personType: personTypeSchema,
  config: avatarConfigSchema,
});

export const lookBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  outfit: outfitSchema,
  resultImageUrl: z.string().url().max(2048).optional(),
  modelRef: modelRefSchema.optional(),
});

/** Express middleware: validate req.body against a schema, 400 on failure. */
export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
      next(new AppError('VALIDATION', message, 400));
      return;
    }
    req.body = parsed.data;
    next();
  };
}
