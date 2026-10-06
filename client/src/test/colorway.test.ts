import { describe, expect, it } from 'vitest';
import { fillFor, patternDefsFor, patternId, shade } from '../lib/color';
import { applyColorStyle, matchColors } from '@vss/shared';
import type { Colorway } from '@vss/shared';

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

describe('colorway → SVG fill mapping', () => {
  it('solid colorway fills with the base hex', () => {
    const c: Colorway = { base: '#1a2b4c', pattern: 'solid', material: 'cotton' };
    expect(fillFor(c, 'u1')).toEqual({ fill: '#1a2b4c' });
  });

  it('patterned colorway fills with a url() reference', () => {
    const c: Colorway = { base: '#1a2b4c', pattern: 'stripes', patternColor: '#ffffff', material: 'cotton' };
    const r = fillFor(c, 'u1');
    expect(r.fill).toBe(`url(#${patternId(c, 'u1')})`);
    expect(r.patternId).toContain('stripes');
  });

  it('pattern ids are unique per colorway + uid', () => {
    const a: Colorway = { base: '#111111', pattern: 'dots', material: 'cotton' };
    const b: Colorway = { base: '#111111', pattern: 'dots', material: 'cotton' };
    expect(patternId(a, 'u1')).toBe(patternId(b, 'u1'));
    expect(patternId(a, 'u1')).not.toBe(patternId(a, 'u2'));
  });

  it('patternDefsFor dedupes identical colorways', () => {
    const c: Colorway = { base: '#1a2b4c', pattern: 'plaid', patternColor: '#ffffff', material: 'cotton' };
    const defs = patternDefsFor([c, c, { base: '#ff0000', pattern: 'solid', material: 'cotton' }], 'u9');
    expect(defs).toHaveLength(1);
    expect(defs[0].kind).toBe('plaid');
    expect(defs[0].base).toBe('#1a2b4c');
  });

  it('shade darkens and lightens in the right direction', () => {
    const base = '#808080';
    expect(luminance(shade(base, -40))).toBeLessThan(luminance(base));
    expect(luminance(shade(base, 40))).toBeGreaterThan(luminance(base));
    expect(shade(base, 0)).toBe(base.toUpperCase());
  });
});

describe('shared color contracts', () => {
  it('applyColorStyle modifiers are deterministic', () => {
    expect(applyColorStyle('#1a2b4c', 'pastel')).toBe(applyColorStyle('#1a2b4c', 'pastel'));
    expect(applyColorStyle('#1a2b4c', 'pastel')).not.toBe(applyColorStyle('#1a2b4c', 'neon'));
  });

  it('matchColors returns theory-based suggestions', () => {
    const matches = matchColors('#1a2b4c');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].relation).toBe('complementary');
    expect(matches.every((m) => /^#[0-9A-F]{6}$/.test(m.hex))).toBe(true);
  });
});
