import { describe, expect, it } from 'vitest';
import {
  avatarBodySchema,
  loginSchema,
  peopleSchema,
  signupSchema,
  suggestSchema,
  tryOnSchema,
} from '../src/schemas';

const validColorway = {
  base: '#1a2b4c',
  pattern: 'solid',
  material: 'cotton',
};

const validAvatarConfig = {
  personType: 'woman',
  skinTone: 5,
  undertone: 'warm',
  face: { shape: 'oval', eyeShape: 'almond', eyeColor: 'brown', brows: 'natural', nose: 'straight', lips: 'full' },
  hair: { color: 'black', length: 'long', texture: 'wavy', style: 'ponytail' },
  body: { height: 'average', build: 'average', shoulder: 'average', waist: 'average', hips: 'average' },
  ageGroup: 'adult',
} as const;

describe('signupSchema', () => {
  it('accepts a valid signup', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'password1' }).success).toBe(true);
  });

  it('rejects bad email and short password', () => {
    expect(signupSchema.safeParse({ email: 'not-an-email', password: 'password1' }).success).toBe(false);
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(false);
    expect(signupSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('rejects missing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('tryOnSchema', () => {
  it('accepts an avatar try-on (client-rendered)', () => {
    const parsed = tryOnSchema.safeParse({
      model: { kind: 'avatar', config: validAvatarConfig },
      outfit: {
        top: { garmentId: 'tshirt', colorway: validColorway, fit: 'regular', size: 'M' },
        accessories: [],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an upload try-on with imageUrl', () => {
    const parsed = tryOnSchema.safeParse({
      model: { kind: 'upload', imageUrl: 'https://example.com/photo.jpg' },
      outfit: { accessories: [] },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects bad model kind, bad hex, and missing outfit', () => {
    expect(
      tryOnSchema.safeParse({ model: { kind: 'hologram' }, outfit: { accessories: [] } }).success,
    ).toBe(false);
    expect(
      tryOnSchema.safeParse({
        model: { kind: 'avatar', config: validAvatarConfig },
        outfit: { top: { garmentId: 'tshirt', colorway: { ...validColorway, base: 'red' } }, accessories: [] },
      }).success,
    ).toBe(false);
    expect(tryOnSchema.safeParse({ model: { kind: 'avatar' } }).success).toBe(false);
  });
});

describe('peopleSchema', () => {
  it('defaults count to 8 and clamps to 1..8', () => {
    const parsed = peopleSchema.safeParse({ filters: { personType: 'man' } });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.count).toBe(8);
    expect(peopleSchema.safeParse({ filters: { personType: 'man' }, count: 0 }).success).toBe(false);
    expect(peopleSchema.safeParse({ filters: { personType: 'man' }, count: 9 }).success).toBe(false);
    expect(peopleSchema.safeParse({ filters: { personType: 'alien' }, count: 2 }).success).toBe(false);
  });
});

describe('suggestSchema', () => {
  it('requires personType and validates colorPref', () => {
    expect(suggestSchema.safeParse({ personType: 'girl', colorPref: '#ff0000' }).success).toBe(true);
    expect(suggestSchema.safeParse({ colorPref: '#ff0000' }).success).toBe(false);
    expect(suggestSchema.safeParse({ personType: 'woman', colorPref: 'red' }).success).toBe(false);
    expect(suggestSchema.safeParse({ personType: 'woman', budget: 'luxury' }).success).toBe(false);
  });
});

describe('avatarBodySchema', () => {
  it('validates AvatarConfig ranges', () => {
    expect(
      avatarBodySchema.safeParse({ name: 'Me', personType: 'woman', config: validAvatarConfig }).success,
    ).toBe(true);
    const badTone = { ...validAvatarConfig, skinTone: 13 };
    expect(
      avatarBodySchema.safeParse({ name: 'Me', personType: 'woman', config: badTone }).success,
    ).toBe(false);
    expect(
      avatarBodySchema.safeParse({ name: '', personType: 'woman', config: validAvatarConfig }).success,
    ).toBe(false);
  });
});
