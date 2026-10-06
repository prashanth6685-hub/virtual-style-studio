import { describe, expect, it } from 'vitest';
import {
  ALL_COLORS,
  applyColorStyle,
  hexToRgb,
  matchColors,
  nearestNamedColor,
  normalizeHex,
  PALETTE,
  rgbToHsl,
} from '../src/colors';
import type { ColorStyle } from '../src/types';

const STYLES: ColorStyle[] = [
  'pastel', 'neon', 'jewel', 'earth', 'muted', 'warm',
  'cool', 'metallic', 'bright', 'dark', 'monochrome', 'neutral',
];

describe('palette', () => {
  it('has exactly the 8 spec groups with valid hex entries', () => {
    const groups = Object.keys(PALETTE);
    expect(groups).toEqual([
      'Basics', 'Reds', 'Blues', 'Greens', 'Pinks', 'Purples', 'Yellow/Orange', 'Neutrals',
    ]);
    for (const c of ALL_COLORS) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(() => normalizeHex(c.hex)).not.toThrow();
    }
  });
});

describe('applyColorStyle', () => {
  it('is deterministic', () => {
    for (const s of STYLES) {
      expect(applyColorStyle('#1a2b4c', s)).toBe(applyColorStyle('#1a2b4c', s));
    }
  });

  it('always returns a valid 6-digit hex', () => {
    for (const s of STYLES) {
      expect(applyColorStyle('#abc', s)).toMatch(/^#[0-9A-F]{6}$/);
      expect(applyColorStyle('#1a2b4c', s)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('pastel lightens, dark darkens, monochrome desaturates', () => {
    const base = hexToRgb('#336699');
    const pastel = hexToRgb(applyColorStyle('#336699', 'pastel'));
    expect(pastel.r + pastel.g + pastel.b).toBeGreaterThan(base.r + base.g + base.b);
    const dark = hexToRgb(applyColorStyle('#336699', 'dark'));
    expect(dark.r + dark.g + dark.b).toBeLessThan(base.r + base.g + base.b);
    const mono = hexToRgb(applyColorStyle('#336699', 'monochrome'));
    expect(mono.r).toBe(mono.g);
    expect(mono.g).toBe(mono.b);
  });

  it('rejects invalid hex input', () => {
    expect(() => applyColorStyle('not-a-color', 'pastel')).toThrow();
  });
});

describe('matchColors', () => {
  it('returns complementary + analogous + triadic suggestions', () => {
    const matches = matchColors('#E53935'); // red
    expect(matches).toHaveLength(5);
    const relations = matches.map((m) => m.relation);
    expect(relations).toContain('complementary');
    expect(relations.filter((r) => r === 'analogous')).toHaveLength(2);
    expect(relations.filter((r) => r === 'triadic')).toHaveLength(2);
    for (const m of matches) {
      expect(m.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it('complementary of red is a green/teal hue (opposite side of the wheel)', () => {
    const [comp] = matchColors('#FF0000');
    expect(comp.relation).toBe('complementary');
    // hue of complement should be ~180deg away
    const h = rgbToHsl(hexToRgb(comp.hex)).h;
    expect(Math.abs(h - 180)).toBeLessThan(25);
  });
});

describe('nearestNamedColor', () => {
  it('finds navy for a dark blue', () => {
    const n = nearestNamedColor('#1E2A5A');
    expect(n.name).toBe('Navy');
  });
});
