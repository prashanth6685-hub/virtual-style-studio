import { describe, expect, it } from 'vitest';
import { avatarConfigToPersonPrefs } from '../src/avatarPrefs';
import type { AvatarConfig } from '../src/types';

function baseConfig(overrides: Partial<AvatarConfig> = {}): AvatarConfig {
  return {
    personType: 'woman',
    skinTone: 5,
    undertone: 'warm',
    face: {
      shape: 'oval',
      eyeShape: 'almond',
      eyeColor: 'brown',
      brows: 'medium',
      nose: 'straight',
      lips: 'full',
      makeup: 'natural',
    },
    hair: { color: '#211d18', length: 'long', texture: 'wavy', style: 'ponytail' },
    body: { height: 'average', build: 'average', shoulder: 'average', waist: 'average', hips: 'average' },
    ageGroup: 'adult',
    ...overrides,
  };
}

describe('avatarConfigToPersonPrefs', () => {
  it('maps every personType through unchanged', () => {
    for (const personType of ['man', 'woman', 'boy', 'girl'] as const) {
      const prefs = avatarConfigToPersonPrefs(baseConfig({ personType }));
      expect(prefs.personType).toBe(personType);
    }
  });

  it('maps a full woman config to neutral descriptors', () => {
    const prefs = avatarConfigToPersonPrefs(baseConfig());
    expect(prefs).toEqual({
      personType: 'woman',
      ageGroup: 'adult',
      skinTone: 5,
      undertone: 'warm',
      hairColor: 'black',
      hairStyle: 'wavy ponytail',
      bodyType: 'average',
    });
  });

  it('maps hex hair colors to neutral names, case-insensitively', () => {
    expect(avatarConfigToPersonPrefs(baseConfig({ hair: { color: '#C99A4E', length: 'long', texture: 'straight', style: 'long' } })).hairColor).toBe('blonde');
    expect(avatarConfigToPersonPrefs(baseConfig({ hair: { color: '#a83c1e', length: 'short', texture: 'straight', style: 'crew' } })).hairColor).toBe('red');
    expect(avatarConfigToPersonPrefs(baseConfig({ hair: { color: '#f2f1ee', length: 'short', texture: 'straight', style: 'buzz' } })).hairColor).toBe('white');
  });

  it('omits hairColor for unknown hex values', () => {
    const prefs = avatarConfigToPersonPrefs(
      baseConfig({ hair: { color: '#123456', length: 'long', texture: 'straight', style: 'long' } }),
    );
    expect(prefs.hairColor).toBeUndefined();
    expect(prefs.hairStyle).toBe('long');
  });

  it('passes through plain hair-color names', () => {
    const prefs = avatarConfigToPersonPrefs(
      baseConfig({ hair: { color: 'black', length: 'long', texture: 'wavy', style: 'ponytail' } }),
    );
    expect(prefs.hairColor).toBe('black');
  });

  it('maps bald texture to a shaved-head descriptor with no hair color', () => {
    const prefs = avatarConfigToPersonPrefs(
      baseConfig({ hair: { color: '#211d18', length: 'short', texture: 'bald', style: 'buzz' } }),
    );
    expect(prefs.hairStyle).toBe('shaved head');
    expect(prefs.hairColor).toBeUndefined();
  });

  it('does not duplicate texture already present in the style', () => {
    const prefs = avatarConfigToPersonPrefs(
      baseConfig({ hair: { color: '#211d18', length: 'short', texture: 'curly', style: 'curly-top' } }),
    );
    expect(prefs.hairStyle).toBe('curly top');
  });

  it('humanizes hyphenated style ids', () => {
    const prefs = avatarConfigToPersonPrefs(
      baseConfig({ hair: { color: '#211d18', length: 'short', texture: 'straight', style: 'side-part' } }),
    );
    expect(prefs.hairStyle).toBe('side part');
  });

  it('maps senior ageGroup to adult', () => {
    const prefs = avatarConfigToPersonPrefs(baseConfig({ ageGroup: 'senior' as never }));
    expect(prefs.ageGroup).toBe('adult');
  });

  it('clamps skinTone into 1..12 and drops non-numeric values', () => {
    expect(avatarConfigToPersonPrefs(baseConfig({ skinTone: 0 })).skinTone).toBe(1);
    expect(avatarConfigToPersonPrefs(baseConfig({ skinTone: 99 })).skinTone).toBe(12);
    expect(avatarConfigToPersonPrefs(baseConfig({ skinTone: 8 })).skinTone).toBe(8);
    expect(avatarConfigToPersonPrefs(baseConfig({ skinTone: Number.NaN })).skinTone).toBeUndefined();
  });

  it('drops unknown body builds and undertones', () => {
    const prefs = avatarConfigToPersonPrefs(
      baseConfig({
        undertone: 'rainbow' as never,
        body: { height: 'average', build: 'bodybuilder', shoulder: 'average', waist: 'average', hips: 'average' },
      }),
    );
    expect(prefs.bodyType).toBeUndefined();
    expect(prefs.undertone).toBeUndefined();
  });

  it('includes facial hair only for men with a non-none style', () => {
    const man = avatarConfigToPersonPrefs(
      baseConfig({ personType: 'man', face: { shape: 'oval', eyeShape: 'almond', eyeColor: 'brown', brows: 'thick', nose: 'straight', lips: 'medium', facialHair: 'goatee' } }),
    );
    expect(man.facialHair).toBe('goatee');
    const clean = avatarConfigToPersonPrefs(
      baseConfig({ personType: 'man', face: { shape: 'oval', eyeShape: 'almond', eyeColor: 'brown', brows: 'thick', nose: 'straight', lips: 'medium', facialHair: 'none' } }),
    );
    expect(clean.facialHair).toBeUndefined();
    const woman = avatarConfigToPersonPrefs(
      baseConfig({ face: { shape: 'oval', eyeShape: 'almond', eyeColor: 'brown', brows: 'medium', nose: 'straight', lips: 'full', facialHair: 'beard' } }),
    );
    expect(woman.facialHair).toBeUndefined();
  });

  it('tolerates missing nested objects', () => {
    const prefs = avatarConfigToPersonPrefs({ personType: 'boy' } as unknown as AvatarConfig);
    expect(prefs.personType).toBe('boy');
    expect(prefs.hairColor).toBeUndefined();
    expect(prefs.bodyType).toBeUndefined();
  });

  it('only ever emits neutral descriptor values', () => {
    const prefs = avatarConfigToPersonPrefs(
      baseConfig({ personType: 'man', skinTone: 11, body: { height: 'average', build: 'plus', shoulder: 'average', waist: 'average', hips: 'average' } }),
    );
    expect(['slim', 'athletic', 'average', 'curvy', 'plus']).toContain(prefs.bodyType);
    expect(['warm', 'cool', 'neutral']).toContain(prefs.undertone);
    // no free-form user text survives except from fixed vocabularies
    for (const v of Object.values(prefs)) {
      expect(String(v)).not.toMatch(/exotic|tribal|oriental/i);
    }
  });
});
