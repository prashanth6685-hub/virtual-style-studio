/**
 * Named color palettes, color-style modifiers, and color-theory matching.
 * Pure functions — deterministic and safe to run anywhere.
 */
import type { ColorStyle, NamedColor, PaletteGroup } from './types';

/** Named palette grouped exactly per spec section 10. */
export const PALETTE: Record<PaletteGroup, NamedColor[]> = {
  Basics: [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
    { name: 'Charcoal', hex: '#36454F' },
    { name: 'Dark Gray', hex: '#4A4A4A' },
    { name: 'Gray', hex: '#9AA0A6' },
    { name: 'Cream', hex: '#FFF8E7' },
  ],
  Reds: [
    { name: 'Red', hex: '#E53935' },
    { name: 'Crimson', hex: '#DC143C' },
    { name: 'Brick Red', hex: '#CB4335' },
    { name: 'Maroon', hex: '#800000' },
    { name: 'Rosewood', hex: '#65000B' },
  ],
  Blues: [
    { name: 'Navy', hex: '#1E2A5A' },
    { name: 'Cobalt', hex: '#0047AB' },
    { name: 'Royal Blue', hex: '#2E5AAC' },
    { name: 'Denim', hex: '#3B5B7E' },
    { name: 'Sky Blue', hex: '#7FB3D5' },
    { name: 'Powder Blue', hex: '#B0C4DE' },
  ],
  Greens: [
    { name: 'Forest Green', hex: '#228B22' },
    { name: 'Emerald', hex: '#50C878' },
    { name: 'Olive', hex: '#808000' },
    { name: 'Sage', hex: '#9CAF88' },
    { name: 'Mint', hex: '#AAF0C1' },
    { name: 'Lime', hex: '#A6D785' },
  ],
  Pinks: [
    { name: 'Hot Pink', hex: '#EC4899' },
    { name: 'Pink', hex: '#F472B6' },
    { name: 'Rose', hex: '#E75480' },
    { name: 'Bubblegum', hex: '#FF9ECB' },
    { name: 'Blush', hex: '#F9C5D5' },
    { name: 'Dusty Rose', hex: '#C08081' },
  ],
  Purples: [
    { name: 'Purple', hex: '#7C3AED' },
    { name: 'Violet', hex: '#8F00FF' },
    { name: 'Plum', hex: '#8E4585' },
    { name: 'Lilac', hex: '#C8A2C8' },
    { name: 'Lavender', hex: '#E6E6FA' },
  ],
  'Yellow/Orange': [
    { name: 'Yellow', hex: '#FACC15' },
    { name: 'Mustard', hex: '#D4A017' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Tangerine', hex: '#F28500' },
    { name: 'Coral', hex: '#FF7F50' },
    { name: 'Peach', hex: '#FFDAB9' },
  ],
  Neutrals: [
    { name: 'Ivory', hex: '#FFFFF0' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Khaki', hex: '#C3B091' },
    { name: 'Camel', hex: '#C19A6B' },
    { name: 'Taupe', hex: '#8B7D6B' },
    { name: 'Brown', hex: '#8B5E3C' },
    { name: 'Chocolate', hex: '#5C4033' },
  ],
};

/** Flat list of every named color, each tagged with its group. */
export const ALL_COLORS: (NamedColor & { group: PaletteGroup })[] = (
  Object.keys(PALETTE) as PaletteGroup[]
).flatMap((group) => PALETTE[group].map((c) => ({ ...c, group })));

export const PATTERNS = [
  'solid',
  'stripes',
  'checks',
  'polka-dots',
  'floral',
  'paisley',
  'geometric',
  'plaid',
  'houndstooth',
  'ikat',
  'abstract',
] as const;

export const MATERIALS = [
  'cotton',
  'denim',
  'linen',
  'silk',
  'wool',
  'polyester',
  'leather',
  'velvet',
  'chiffon',
  'knit',
  'satin',
  'corduroy',
] as const;

export const FITS = ['slim', 'regular', 'relaxed', 'oversized'] as const;

export const SIZES_ADULT = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export const SIZES_KIDS = ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y'] as const;
export const SIZES: string[] = [...SIZES_ADULT, ...SIZES_KIDS];

// ---------------------------------------------------------------------------
// Color math
// ---------------------------------------------------------------------------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHex(hex: string): string {
  const m = HEX_RE.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h.toUpperCase()}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  if (sn === 0) {
    const v = ln * 255;
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const tc = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return { r: tc(hn + 1 / 3) * 255, g: tc(hn) * 255, b: tc(hn - 1 / 3) * 255 };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const SILVER: Rgb = { r: 192, g: 192, b: 192 };

/**
 * Transform a base hex color into a named color style.
 * Deterministic: same (hex, style) always yields the same result.
 */
export function applyColorStyle(hex: string, style: ColorStyle): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const H = (h: number, s: number, l: number): string => rgbToHex(hslToRgb({ h, s, l }));

  switch (style) {
    case 'pastel':
      return rgbToHex(mix(rgb, WHITE, 0.55));
    case 'neon':
      return H(hsl.h, 100, 55);
    case 'jewel':
      return H(hsl.h, Math.max(hsl.s, 80), 38);
    case 'earth': {
      // pull saturation down and nudge hue toward warm brown (~28°)
      const h = hsl.h + (28 - hsl.h) * 0.35;
      return H(h, hsl.s * 0.45, Math.min(hsl.l, 45));
    }
    case 'muted':
      return H(hsl.h, hsl.s * 0.45, hsl.l);
    case 'warm':
      return H(hsl.h + 18, hsl.s, hsl.l);
    case 'cool':
      return H(hsl.h - 18, hsl.s, hsl.l);
    case 'metallic':
      return rgbToHex(mix(rgb, SILVER, 0.45));
    case 'bright':
      return H(hsl.h, Math.max(hsl.s, 90), 60);
    case 'dark':
      return H(hsl.h, hsl.s, hsl.l * 0.45);
    case 'monochrome':
      return H(0, 0, hsl.l);
    case 'neutral':
      return H(hsl.h, hsl.s * 0.22, hsl.l);
  }
}

// ---------------------------------------------------------------------------
// Color-theory matching
// ---------------------------------------------------------------------------

export interface ColorMatch {
  name: string;
  hex: string;
  relation: 'complementary' | 'analogous' | 'triadic';
}

const HUE_NAMES: [number, string][] = [
  [15, 'Red'],
  [45, 'Orange'],
  [70, 'Yellow'],
  [160, 'Green'],
  [200, 'Teal'],
  [260, 'Blue'],
  [300, 'Purple'],
  [345, 'Pink'],
  [361, 'Red'],
];

function hueName(h: number): string {
  const hn = (((h % 360) + 360) % 360);
  for (const [limit, name] of HUE_NAMES) {
    if (hn < limit) return name;
  }
  return 'Red';
}

/**
 * Return complementary / analogous / triadic suggestions for a hex color.
 * Useful for "what goes with this?" UI and the GET /api/colors/match endpoint.
 */
export function matchColors(hex: string): ColorMatch[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  const sat = Math.max(s, 45); // keep suggestions vivid enough to be useful
  const lit = Math.min(72, Math.max(38, l));
  const at = (dh: number, relation: ColorMatch['relation']): ColorMatch => {
    const nh = (((h + dh) % 360) + 360) % 360;
    return {
      name: `${relation === 'complementary' ? 'Complementary' : relation === 'analogous' ? 'Analogous' : 'Triadic'} ${hueName(nh)}`,
      hex: rgbToHex(hslToRgb({ h: nh, s: sat, l: lit })),
      relation,
    };
  };
  return [
    at(180, 'complementary'),
    at(-30, 'analogous'),
    at(30, 'analogous'),
    at(120, 'triadic'),
    at(240, 'triadic'),
  ];
}

/** Find the closest named palette color to a hex value. */
export function nearestNamedColor(hex: string): NamedColor & { group: PaletteGroup } {
  const target = hexToRgb(hex);
  let best = ALL_COLORS[0];
  let bestDist = Infinity;
  for (const c of ALL_COLORS) {
    const rgb = hexToRgb(c.hex);
    const d = (rgb.r - target.r) ** 2 + (rgb.g - target.g) ** 2 + (rgb.b - target.b) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
