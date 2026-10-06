import { describe, expect, it } from 'vitest';
import { defaultAvatarConfig, presetAvatarConfigs } from '../avatar/avatarDefaults';
import { validateAvatarConfig, sanitizeAvatarConfig } from '../avatar/validation';
import type { AvatarConfig } from '../avatar/types';

describe('avatar defaults', () => {
  it.each(['man', 'woman', 'boy', 'girl'] as const)('default %s config is valid', (pt) => {
    const c = defaultAvatarConfig(pt);
    expect(c.personType).toBe(pt);
    const v = validateAvatarConfig(c);
    expect(v.errors).toEqual([]);
    expect(v.valid).toBe(true);
  });

  it('uses the shared 1–12 skin tone scale', () => {
    for (const pt of ['man', 'woman', 'boy', 'girl'] as const) {
      const c = defaultAvatarConfig(pt);
      expect(c.skinTone).toBeGreaterThanOrEqual(1);
      expect(c.skinTone).toBeLessThanOrEqual(12);
    }
  });

  it('kids default to child age group and no facial hair', () => {
    const boy = defaultAvatarConfig('boy');
    expect(boy.ageGroup).toBe('child');
    expect(boy.face.facialHair).toBe('none');
    const girl = defaultAvatarConfig('girl');
    expect(girl.face.makeup).not.toBe('bold');
  });

  it('presets are all valid', () => {
    for (const p of presetAvatarConfigs()) {
      expect(validateAvatarConfig(p.config).valid).toBe(true);
    }
  });
});

describe('avatar validation', () => {
  const good = (): AvatarConfig => defaultAvatarConfig('woman');

  it('rejects out-of-range skin tones', () => {
    for (const skinTone of [0, 13, 2.5, NaN]) {
      const c = { ...good(), skinTone } as AvatarConfig;
      expect(validateAvatarConfig(c).valid).toBe(false);
    }
  });

  it('rejects non-hex hair colors', () => {
    const c = good();
    c.hair = { ...c.hair, color: 'red' };
    const v = validateAvatarConfig(c);
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes('hair.color'))).toBe(true);
  });

  it('rejects a style not offered for the person type', () => {
    const c = defaultAvatarConfig('man');
    c.hair = { ...c.hair, style: 'pigtails' };
    expect(validateAvatarConfig(c).valid).toBe(false);
  });

  it('safety: kids cannot have facial hair', () => {
    const c = defaultAvatarConfig('boy');
    c.face = { ...c.face, facialHair: 'beard' };
    const v = validateAvatarConfig(c);
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes('facial hair'))).toBe(true);
  });

  it('safety: bold makeup is adult-only', () => {
    const c = defaultAvatarConfig('girl');
    c.face = { ...c.face, makeup: 'bold' };
    expect(validateAvatarConfig(c).valid).toBe(false);
  });

  it('sanitize coerces unsafe kid configs instead of crashing', () => {
    const c = defaultAvatarConfig('boy');
    c.face = { ...c.face, facialHair: 'beard' };
    const s = sanitizeAvatarConfig(c, 'boy');
    expect(s.face.facialHair).toBe('none');
    expect(validateAvatarConfig(s).valid).toBe(true);
  });

  it('sanitize falls back to defaults for garbage input', () => {
    const s = sanitizeAvatarConfig({ nonsense: true }, 'woman');
    expect(validateAvatarConfig(s).valid).toBe(true);
    expect(s.personType).toBe('woman');
  });
});
