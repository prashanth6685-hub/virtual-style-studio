import type { PersonType } from '@vss/shared';
import type { AvatarConfig } from './types';

function base(personType: PersonType): AvatarConfig {
  return {
    personType,
    skinTone: 6,
    undertone: 'neutral',
    face: {
      shape: 'oval',
      eyeShape: 'almond',
      eyeColor: 'brown',
      brows: 'medium',
      nose: 'straight',
      lips: 'medium',
      facialHair: 'none',
      makeup: 'none',
    },
    hair: { color: '#211d18', length: 'short', texture: 'straight', style: 'crew' },
    body: { height: 0.5, build: 'average', shoulder: 0.5, waist: 0.5, hips: 0.5 },
    ageGroup: 'adult',
  };
}

/** Sensible starter identity per person type. Identity never includes clothing. */
export function defaultAvatarConfig(personType: PersonType): AvatarConfig {
  const c = base(personType);
  switch (personType) {
    case 'man':
      c.hair = { color: '#211d18', length: 'short', texture: 'straight', style: 'side-part' };
      c.face.facialHair = 'none';
      c.body.build = 'average';
      break;
    case 'woman':
      c.hair = { color: '#3b2a1e', length: 'long', texture: 'wavy', style: 'long' };
      c.face.makeup = 'natural';
      c.face.eyeShape = 'almond';
      c.body.build = 'average';
      break;
    case 'boy':
      c.hair = { color: '#211d18', length: 'short', texture: 'straight', style: 'messy' };
      c.ageGroup = 'child';
      c.body.build = 'slim';
      c.body.height = 0.35;
      break;
    case 'girl':
      c.hair = { color: '#3b2a1e', length: 'medium', texture: 'wavy', style: 'pigtails' };
      c.ageGroup = 'child';
      c.body.build = 'slim';
      c.body.height = 0.35;
      break;
  }
  return c;
}

/** A small set of ready-made identities for quick start / examples. */
export function presetAvatarConfigs(): { name: string; config: AvatarConfig }[] {
  const a = defaultAvatarConfig('woman');
  a.skinTone = 3; a.hair = { color: '#c99a4e', length: 'long', texture: 'wavy', style: 'long' };
  const b = defaultAvatarConfig('man');
  b.skinTone = 9; b.hair = { color: '#211d18', length: 'short', texture: 'coily', style: 'fade' };
  b.face.facialHair = 'beard';
  const c = defaultAvatarConfig('girl');
  c.skinTone = 5; c.hair = { color: '#211d18', length: 'long', texture: 'curly', style: 'braids' };
  const d = defaultAvatarConfig('boy');
  d.skinTone = 7; d.hair = { color: '#211d18', length: 'short', texture: 'curly', style: 'curly-top' };
  return [
    { name: 'Ava', config: a },
    { name: 'Marcus', config: b },
    { name: 'Priya', config: c },
    { name: 'Leo', config: d },
  ];
}
