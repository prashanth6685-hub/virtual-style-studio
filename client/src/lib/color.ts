import type { Colorway } from '@vss/shared';
import { hexToRgb, rgbToHex } from '@vss/shared';

/**
 * SVG-specific color helpers for the avatar renderer.
 * Base color math comes from `@vss/shared`; this module adds SVG pattern fills.
 */

/** Darken (negative pct) or lighten (positive pct) a hex color. pct in -100..100. */
export function shade(hex: string, pct: number): string {
  const { r, g, b } = hexToRgb(hex);
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  return rgbToHex({
    r: r + (t - r) * p,
    g: g + (t - g) * p,
    b: b + (t - b) * p,
  });
}

/** Fill resolver for a colorway: solid color, or a generated SVG pattern id. */
export function fillFor(colorway: Colorway, uid: string): { fill: string; patternId?: string } {
  if (colorway.pattern === 'solid' || !colorway.pattern) {
    return { fill: colorway.base };
  }
  return { fill: `url(#${patternId(colorway, uid)})`, patternId: patternId(colorway, uid) };
}

export function patternId(colorway: Colorway, uid: string): string {
  const pc = (colorway.patternColor ?? '#ffffff').replace('#', '');
  return `vss-pat-${colorway.pattern}-${colorway.base.replace('#', '')}-${pc}-${uid}`;
}

export interface PatternDef {
  id: string;
  kind: 'stripes' | 'dots' | 'plaid';
  base: string;
  accent: string;
}

/** Collect the unique pattern defs needed for a set of colorways. */
export function patternDefsFor(colorways: Colorway[], uid: string): PatternDef[] {
  const seen = new Map<string, PatternDef>();
  for (const c of colorways) {
    if (c.pattern === 'solid' || !c.pattern) continue;
    const kind = (['stripes', 'dots', 'plaid'] as const).includes(c.pattern as 'stripes' | 'dots' | 'plaid')
      ? (c.pattern as 'stripes' | 'dots' | 'plaid')
      : 'stripes';
    const id = patternId(c, uid);
    if (!seen.has(id)) {
      seen.set(id, { id, kind, base: c.base, accent: c.patternColor ?? '#ffffff' });
    }
  }
  return [...seen.values()];
}
