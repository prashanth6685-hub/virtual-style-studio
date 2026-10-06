import type { Colorway } from '@vss/shared';
import type { AvatarConfig } from './types';
import type { BodyGeom } from './body';
import { faceLandmarks } from './face';
import { fillFor, shade } from '../lib/color';

export interface GarmentProps {
  garmentId: string;
  colorway: Colorway;
  geom: BodyGeom;
  config: AvatarConfig;
  /** unique prefix so SVG pattern ids don't collide between instances */
  uid: string;
}

export type GarmentLayer = 'head' | 'neck' | 'wrist' | 'body';

/** Which SVG layer a garment/accessory is painted on. */
export function garmentLayer(id: string): GarmentLayer {
  if (['cap', 'hat', 'sunglasses', 'earrings'].includes(id)) return 'head';
  if (['scarf', 'tie', 'necklace'].includes(id)) return 'neck';
  if (id === 'watch') return 'wrist';
  return 'body';
}

/** Studio tab a garment belongs to. */
export function garmentTab(id: string): string {
  if (['tshirt', 'polo', 'shirt', 'hoodie', 'kurta', 'blouse', 'tanktop', 'sweater'].includes(id)) return 'Tops';
  if (['jeans', 'chinos', 'shorts', 'skirt', 'leggings'].includes(id)) return 'Bottoms';
  if (['dress-casual', 'dress-maxi', 'dress-saree'].includes(id)) return 'Dresses';
  if (['blazer', 'jacket'].includes(id)) return 'Outerwear';
  if (['sneakers', 'heels', 'sandals', 'boots'].includes(id)) return 'Shoes';
  return 'Accessories';
}

export const GARMENT_NAMES: Record<string, string> = {
  tshirt: 'T-Shirt',
  polo: 'Polo Shirt',
  shirt: 'Button-Up Shirt',
  hoodie: 'Hoodie',
  kurta: 'Kurta',
  blouse: 'Blouse',
  tanktop: 'Tank Top',
  sweater: 'Sweater',
  jeans: 'Jeans',
  chinos: 'Chinos',
  shorts: 'Shorts',
  skirt: 'Skirt',
  leggings: 'Leggings',
  'dress-casual': 'Casual Dress',
  'dress-maxi': 'Maxi Dress',
  'dress-saree': 'Saree',
  blazer: 'Blazer',
  jacket: 'Jacket',
  sneakers: 'Sneakers',
  heels: 'Heels',
  sandals: 'Sandals',
  boots: 'Boots',
  watch: 'Watch',
  sunglasses: 'Sunglasses',
  cap: 'Cap',
  hat: 'Sun Hat',
  belt: 'Belt',
  necklace: 'Necklace',
  earrings: 'Earrings',
  scarf: 'Scarf',
  tie: 'Tie',
};

interface Ctx {
  g: BodyGeom;
  fill: string;
  dark: string;
  darker: string;
  light: string;
  stroke: string;
  uid: string;
}

function ctxFor(colorway: Colorway, g: BodyGeom, uid: string): Ctx {
  const { fill } = fillFor(colorway, uid);
  const base = colorway.base;
  return {
    g,
    fill,
    dark: shade(base, -14),
    darker: shade(base, -28),
    light: shade(base, 20),
    stroke: shade(base, -32),
    uid,
  };
}

const F = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Tops
// ---------------------------------------------------------------------------

/** Torso block shared by tops. neckDrop: crew 10 / scoop 24 / deep 34. */
function torsoD(g: BodyGeom, hemY: number, ease: number, neckDrop: number): string {
  const { cx, shoulderY, shoulderHW, chestHW, waistHW } = g;
  const shX = shoulderHW - 2;
  return [
    `M ${F(cx - shX)} ${F(shoulderY + 4)}`,
    `Q ${F(cx)} ${F(shoulderY + neckDrop)} ${F(cx + shX)} ${F(shoulderY + 4)}`,
    `C ${F(cx + shX + 4)} ${F(shoulderY + 40)}, ${F(cx + chestHW + ease)} ${F(g.chestY - 10)}, ${F(cx + chestHW + ease)} ${F(g.chestY)}`,
    `C ${F(cx + waistHW + ease)} ${F((g.chestY + hemY) / 2)}, ${F(cx + waistHW + ease)} ${F(hemY - 14)}, ${F(cx + waistHW + ease)} ${F(hemY)}`,
    `Q ${F(cx)} ${F(hemY + 7)} ${F(cx - waistHW - ease)} ${F(hemY)}`,
    `C ${F(cx - waistHW - ease)} ${F(hemY - 14)}, ${F(cx - waistHW - ease)} ${F((g.chestY + hemY) / 2)}, ${F(cx - chestHW - ease)} ${F(g.chestY)}`,
    `C ${F(cx - chestHW - ease)} ${F(g.chestY - 10)}, ${F(cx - shX - 4)} ${F(shoulderY + 40)}, ${F(cx - shX)} ${F(shoulderY + 4)}`,
    'Z',
  ].join(' ');
}

function shortSleeveD(g: BodyGeom, s: -1 | 1, len = 1): string {
  const { cx, shoulderY, shoulderHW } = g;
  const sx = cx + s * shoulderHW;
  return [
    `M ${F(sx - s * 6)} ${F(shoulderY + 2)}`,
    `L ${F(sx + s * 21 * len)} ${F(shoulderY + 30 * len)}`,
    `L ${F(sx + s * 13 * len)} ${F(shoulderY + 46 * len)}`,
    `L ${F(sx - s * 8)} ${F(shoulderY + 32)}`,
    'Z',
  ].join(' ');
}

function longSleeveD(g: BodyGeom, s: -1 | 1, cuffAt: number): { arm: string; cuffY: number } {
  const { cx, shoulderY, shoulderHW, armHW } = g;
  const sx = cx + s * (shoulderHW - 4);
  const wx = cx + s * (shoulderHW - 10);
  const wTop = armHW + 4;
  const wBot = armHW * 0.7 + 3;
  return {
    arm: [
      `M ${F(sx - wTop)} ${F(shoulderY + 2)}`,
      `L ${F(wx - wBot)} ${F(cuffAt)}`,
      `L ${F(wx + wBot)} ${F(cuffAt)}`,
      `L ${F(sx + wTop)} ${F(shoulderY + 2)}`,
      'Z',
    ].join(' '),
    cuffY: cuffAt,
  };
}

function GarmentShell({ c, d, children }: { c: Ctx; d: string; children?: React.ReactNode }) {
  return (
    <g>
      <path d={d} fill={c.fill} stroke={c.stroke} strokeWidth={1.6} strokeLinejoin="round" />
      {children}
    </g>
  );
}

function TShirt({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.waistY + 26;
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <GarmentShell key={s} c={c} d={shortSleeveD(g, s)} />
      ))}
      <GarmentShell c={c} d={torsoD(g, hemY, 2, 12)}>
        <path
          d={`M ${F(g.cx - g.shoulderHW + 4)} ${F(g.shoulderY + 6)} Q ${F(g.cx)} ${F(g.shoulderY + 26)} ${F(g.cx + g.shoulderHW - 4)} ${F(g.shoulderY + 6)}`}
          fill="none"
          stroke={c.darker}
          strokeWidth={3}
        />
        <path
          d={`M ${F(g.cx - g.waistHW - 1)} ${F(hemY - 8)} Q ${F(g.cx)} ${F(hemY - 2)} ${F(g.cx + g.waistHW + 1)} ${F(hemY - 8)}`}
          fill="none"
          stroke={c.dark}
          strokeWidth={2}
          opacity={0.7}
        />
      </GarmentShell>
    </g>
  );
}

function Polo({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.waistY + 26;
  const nx = g.cx;
  const ny = g.shoulderY + 6;
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <GarmentShell key={s} c={c} d={shortSleeveD(g, s)} />
      ))}
      <GarmentShell c={c} d={torsoD(g, hemY, 2, 10)}>
        {/* collar */}
        <path
          d={`M ${F(nx - 16)} ${F(ny)} L ${F(nx - 4)} ${F(ny + 16)} L ${F(nx - 12)} ${F(ny + 20)} L ${F(nx - 22)} ${F(ny + 6)} Z`}
          fill={c.dark}
          stroke={c.stroke}
          strokeWidth={1.2}
        />
        <path
          d={`M ${F(nx + 16)} ${F(ny)} L ${F(nx + 4)} ${F(ny + 16)} L ${F(nx + 12)} ${F(ny + 20)} L ${F(nx + 22)} ${F(ny + 6)} Z`}
          fill={c.dark}
          stroke={c.stroke}
          strokeWidth={1.2}
        />
        {/* placket + buttons */}
        <rect x={F(nx - 5)} y={F(ny + 12)} width={10} height={30} fill={c.dark} opacity={0.55} />
        <circle cx={nx} cy={F(ny + 22)} r={2.6} fill={c.light} stroke={c.stroke} strokeWidth={1} />
        <circle cx={nx} cy={F(ny + 33)} r={2.6} fill={c.light} stroke={c.stroke} strokeWidth={1} />
      </GarmentShell>
    </g>
  );
}

function Shirt({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.waistY + 30;
  const nx = g.cx;
  const ny = g.shoulderY + 4;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const { arm, cuffY } = longSleeveD(g, s, g.wristY - 8);
        const wx = g.cx + s * (g.shoulderHW - 10);
        return (
          <g key={s}>
            <GarmentShell c={c} d={arm} />
            <rect
              x={F(wx - g.armHW * 0.7 - 3)}
              y={F(cuffY - 2)}
              width={F((g.armHW * 0.7 + 3) * 2)}
              height={12}
              rx={3}
              fill={c.dark}
              stroke={c.stroke}
              strokeWidth={1.2}
            />
          </g>
        );
      })}
      <GarmentShell c={c} d={torsoD(g, hemY, 1, 8)}>
        {/* collar */}
        <path
          d={`M ${F(nx - 14)} ${F(ny)} L ${F(nx - 2)} ${F(ny + 14)} L ${F(nx - 14)} ${F(ny + 22)} L ${F(nx - 24)} ${F(ny + 4)} Z`}
          fill={c.light}
          stroke={c.stroke}
          strokeWidth={1.2}
        />
        <path
          d={`M ${F(nx + 14)} ${F(ny)} L ${F(nx + 2)} ${F(ny + 14)} L ${F(nx + 14)} ${F(ny + 22)} L ${F(nx + 24)} ${F(ny + 4)} Z`}
          fill={c.light}
          stroke={c.stroke}
          strokeWidth={1.2}
        />
        {/* button placket */}
        <rect x={F(nx - 4)} y={F(ny + 14)} width={8} height={F(hemY - ny - 14)} fill={c.dark} opacity={0.4} />
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={nx} cy={F(ny + 34 + i * 26)} r={2.6} fill={c.light} stroke={c.stroke} strokeWidth={1} />
        ))}
        {/* fold lines */}
        <path
          d={`M ${F(nx - 30)} ${F(ny + 60)} q 4 40 0 80 M ${F(nx + 30)} ${F(ny + 60)} q -4 40 0 80`}
          stroke={c.dark}
          strokeWidth={2}
          fill="none"
          opacity={0.5}
        />
      </GarmentShell>
    </g>
  );
}

function Hoodie({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.hipY - 6;
  const nx = g.cx;
  return (
    <g>
      {/* hood behind neck */}
      <path
        d={`M ${F(nx - g.neckHW - 18)} ${F(g.neckTopY + 2)} Q ${F(nx)} ${F(g.neckTopY - 26)} ${F(nx + g.neckHW + 18)} ${F(g.neckTopY + 2)} Q ${F(nx)} ${F(g.neckTopY + 16)} ${F(nx - g.neckHW - 18)} ${F(g.neckTopY + 2)} Z`}
        fill={c.dark}
        stroke={c.stroke}
        strokeWidth={1.6}
      />
      {([-1, 1] as const).map((s) => {
        const { arm, cuffY } = longSleeveD(g, s, g.wristY - 14);
        const wx = g.cx + s * (g.shoulderHW - 10);
        return (
          <g key={s}>
            <GarmentShell c={c} d={arm} />
            <rect
              x={F(wx - g.armHW * 0.7 - 3)}
              y={F(cuffY - 2)}
              width={F((g.armHW * 0.7 + 3) * 2)}
              height={12}
              rx={4}
              fill={c.dark}
              stroke={c.stroke}
              strokeWidth={1.2}
            />
          </g>
        );
      })}
      <GarmentShell c={c} d={torsoD(g, hemY, 8, 14)}>
        {/* drawstrings */}
        <path d={`M ${F(nx - 8)} ${F(g.shoulderY + 26)} q -3 18 2 34`} stroke={c.light} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        <path d={`M ${F(nx + 8)} ${F(g.shoulderY + 26)} q 3 18 -2 34`} stroke={c.light} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        {/* kangaroo pocket */}
        <path
          d={`M ${F(nx - 34)} ${F(g.waistY - 6)} L ${F(nx + 34)} ${F(g.waistY - 6)} L ${F(nx + 28)} ${F(g.waistY + 34)} L ${F(nx - 28)} ${F(g.waistY + 34)} Z`}
          fill={c.dark}
          stroke={c.stroke}
          strokeWidth={1.4}
          opacity={0.85}
        />
        {/* ribbed hem */}
        <rect x={F(nx - g.waistHW - 7)} y={F(hemY - 12)} width={F((g.waistHW + 7) * 2)} height={13} rx={4} fill={c.dark} stroke={c.stroke} strokeWidth={1.2} opacity={0.9} />
      </GarmentShell>
    </g>
  );
}

function Kurta({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.kneeY - 34;
  const nx = g.cx;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const cuffAt = g.shoulderY + (g.wristY - g.shoulderY) * 0.72;
        const { arm, cuffY } = longSleeveD(g, s, cuffAt);
        return <GarmentShell key={s} c={c} d={arm} />;
      })}
      <GarmentShell c={c} d={torsoD(g, hemY, 6, 8)}>
        {/* mandarin collar */}
        <rect x={F(nx - 15)} y={F(g.shoulderY - 2)} width={30} height={12} rx={4} fill={c.dark} stroke={c.stroke} strokeWidth={1.2} />
        {/* placket */}
        <rect x={F(nx - 4)} y={F(g.shoulderY + 10)} width={8} height={44} fill={c.dark} opacity={0.45} />
        {[0, 1].map((i) => (
          <circle key={i} cx={nx} cy={F(g.shoulderY + 26 + i * 18)} r={2.6} fill={c.light} stroke={c.stroke} strokeWidth={1} />
        ))}
        {/* side slits */}
        <path d={`M ${F(nx - g.waistHW - 5)} ${F(g.hipY + 30)} L ${F(nx - g.waistHW - 5)} ${F(hemY)}`} stroke={c.darker} strokeWidth={2.4} />
        <path d={`M ${F(nx + g.waistHW + 5)} ${F(g.hipY + 30)} L ${F(nx + g.waistHW + 5)} ${F(hemY)}`} stroke={c.darker} strokeWidth={2.4} />
        {/* hem border motif */}
        <path
          d={`M ${F(nx - g.waistHW - 4)} ${F(hemY - 12)} Q ${F(nx)} ${F(hemY - 5)} ${F(nx + g.waistHW + 4)} ${F(hemY - 12)}`}
          fill="none"
          stroke={c.light}
          strokeWidth={3}
          opacity={0.8}
        />
      </GarmentShell>
    </g>
  );
}

function Blouse({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.waistY + 18;
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <GarmentShell key={s} c={c} d={shortSleeveD(g, s, 0.85)} />
      ))}
      <GarmentShell c={c} d={torsoD(g, hemY, 0, 26)}>
        <path
          d={`M ${F(g.cx - g.shoulderHW + 6)} ${F(g.shoulderY + 8)} Q ${F(g.cx)} ${F(g.shoulderY + 46)} ${F(g.cx + g.shoulderHW - 6)} ${F(g.shoulderY + 8)}`}
          fill="none"
          stroke={c.darker}
          strokeWidth={2.6}
        />
        {[0, 1].map((i) => (
          <circle key={i} cx={F(g.cx)} cy={F(g.shoulderY + 66 + i * 30)} r={2.4} fill={c.light} stroke={c.stroke} strokeWidth={1} />
        ))}
      </GarmentShell>
    </g>
  );
}

function TankTop({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.waistY + 20;
  const strapX = g.neckHW + 12;
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <rect
          key={s}
          x={F(g.cx + s * strapX - 7)}
          y={F(g.shoulderY - 2)}
          width={14}
          height={F(g.chestY - g.shoulderY)}
          rx={4}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth={1.4}
        />
      ))}
      <GarmentShell c={c} d={torsoD(g, hemY, 0, 30)}>
        <path
          d={`M ${F(g.cx - strapX)} ${F(g.shoulderY + 6)} Q ${F(g.cx)} ${F(g.shoulderY + 52)} ${F(g.cx + strapX)} ${F(g.shoulderY + 6)}`}
          fill="none"
          stroke={c.darker}
          strokeWidth={2.6}
        />
      </GarmentShell>
    </g>
  );
}

function Sweater({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.waistY + 30;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const { arm, cuffY } = longSleeveD(g, s, g.wristY - 10);
        const wx = g.cx + s * (g.shoulderHW - 10);
        return (
          <g key={s}>
            <GarmentShell c={c} d={arm} />
            <rect x={F(wx - g.armHW * 0.7 - 3)} y={F(cuffY - 2)} width={F((g.armHW * 0.7 + 3) * 2)} height={12} rx={4} fill={c.dark} stroke={c.stroke} strokeWidth={1.2} />
          </g>
        );
      })}
      <GarmentShell c={c} d={torsoD(g, hemY, 7, 10)}>
        <path
          d={`M ${F(g.cx - g.shoulderHW + 6)} ${F(g.shoulderY + 8)} Q ${F(g.cx)} ${F(g.shoulderY + 28)} ${F(g.cx + g.shoulderHW - 6)} ${F(g.shoulderY + 8)}`}
          fill="none"
          stroke={c.darker}
          strokeWidth={4}
        />
        <rect x={F(g.cx - g.waistHW - 6)} y={F(hemY - 12)} width={F((g.waistHW + 6) * 2)} height={13} rx={4} fill={c.dark} stroke={c.stroke} strokeWidth={1.2} opacity={0.9} />
        {/* knit texture */}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M ${F(g.cx - 34 + i * 26)} ${F(g.shoulderY + 70)} q 3 44 0 88`}
            stroke={c.dark}
            strokeWidth={1.6}
            fill="none"
            opacity={0.45}
          />
        ))}
      </GarmentShell>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Bottoms
// ---------------------------------------------------------------------------

function legD(g: BodyGeom, s: -1 | 1, topY: number, topHW: number, botY: number, botHW: number): string {
  const { cx, crotchY } = g;
  const innerHW = 5;
  return [
    `M ${F(cx + s * topHW)} ${F(topY)}`,
    `L ${F(cx + s * botHW)} ${F(botY)}`,
    `L ${F(cx + s * (botHW - 10))} ${F(botY)}`,
    `L ${F(cx + s * innerHW)} ${F(crotchY + 4)}`,
    `Q ${F(cx + s * innerHW * 0.6)} ${F((crotchY + topY) / 2)} ${F(cx + s * topHW * 0.92)} ${F(topY)}`,
    'Z',
  ].join(' ');
}

function seatD(g: BodyGeom, ease: number): string {
  const { cx, waistY, hipHW, crotchY } = g;
  const hw = hipHW + ease;
  return [
    `M ${F(cx - hw)} ${F(waistY + 2)}`,
    `C ${F(cx - hw)} ${F(waistY + 34)}, ${F(cx - 12)} ${F(crotchY - 8)}, ${F(cx)} ${F(crotchY)}`,
    `C ${F(cx + 12)} ${F(crotchY - 8)}, ${F(cx + hw)} ${F(waistY + 34)}, ${F(cx + hw)} ${F(waistY + 2)}`,
    `Q ${F(cx)} ${F(waistY + 10)} ${F(cx - hw)} ${F(waistY + 2)} Z`,
  ].join(' ');
}

function waistband(c: Ctx, h = 11): React.ReactNode {
  const { g } = c;
  return (
    <rect
      x={F(g.cx - g.waistHW - 3)}
      y={F(g.waistY - 4)}
      width={F((g.waistHW + 3) * 2)}
      height={h}
      rx={3}
      fill={c.dark}
      stroke={c.stroke}
      strokeWidth={1.2}
    />
  );
}

function Jeans({ c }: { c: Ctx }) {
  const { g } = c;
  const stitch = shade(c.fill.startsWith('url') ? '#3b5b8c' : c.fill, 30);
  return (
    <g>
      <GarmentShell c={c} d={seatD(g, 3)} />
      {([-1, 1] as const).map((s) => (
        <GarmentShell key={s} c={c} d={legD(g, s, g.hipY - 6, g.hipHW * 0.52 + 4, g.ankleY + 2, 13)}>
          {/* pocket */}
          <path
            d={`M ${F(g.cx + s * (g.hipHW - 2))} ${F(g.waistY + 12)} q ${F(s * -14)} 6 ${F(s * -10)} 20`}
            fill="none"
            stroke={c.darker}
            strokeWidth={2}
          />
          {/* crease + stitching */}
          <path
            d={`M ${F(g.cx + s * (g.hipHW * 0.3))} ${F(g.hipY + 20)} L ${F(g.cx + s * 9)} ${F(g.ankleY - 6)}`}
            fill="none"
            stroke={stitch}
            strokeWidth={1.4}
            strokeDasharray="5 4"
            opacity={0.8}
          />
        </GarmentShell>
      ))}
      {waistband(c)}
      {/* fly */}
      <path d={`M ${F(g.cx)} ${F(g.waistY + 8)} L ${F(g.cx + 3)} ${F(g.waistY + 40)}`} stroke={c.darker} strokeWidth={2} />
      <circle cx={F(g.cx)} cy={F(g.waistY + 2)} r={2.6} fill={c.light} stroke={c.stroke} strokeWidth={1} />
    </g>
  );
}

function Chinos({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      <GarmentShell c={c} d={seatD(g, 2)} />
      {([-1, 1] as const).map((s) => (
        <GarmentShell key={s} c={c} d={legD(g, s, g.hipY - 6, g.hipHW * 0.5 + 3, g.ankleY + 2, 14)}>
          <path
            d={`M ${F(g.cx + s * (g.hipHW * 0.28))} ${F(g.hipY + 16)} L ${F(g.cx + s * 10)} ${F(g.ankleY - 4)}`}
            stroke={c.dark}
            strokeWidth={1.6}
            opacity={0.6}
          />
        </GarmentShell>
      ))}
      {waistband(c)}
    </g>
  );
}

function Shorts({ c }: { c: Ctx }) {
  const { g } = c;
  const botY = g.waistY + (g.crotchY - g.waistY) * 1.15;
  return (
    <g>
      <GarmentShell c={c} d={seatD(g, 4)} />
      {([-1, 1] as const).map((s) => (
        <GarmentShell key={s} c={c} d={legD(g, s, g.hipY - 6, g.hipHW * 0.55 + 5, botY, 24)} />
      ))}
      {waistband(c, 12)}
      {/* drawstring */}
      <path d={`M ${F(g.cx - 6)} ${F(g.waistY + 8)} q -2 12 -6 16 M ${F(g.cx + 6)} ${F(g.waistY + 8)} q 2 12 6 16`} stroke={c.light} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Skirt({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.kneeY - 14;
  const flare = g.waistHW + 30;
  return (
    <g>
      <path
        d={[
          `M ${F(g.cx - g.waistHW - 2)} ${F(g.waistY)}`,
          `L ${F(g.cx - flare)} ${F(hemY)}`,
          `Q ${F(g.cx)} ${F(hemY + 10)} ${F(g.cx + flare)} ${F(hemY)}`,
          `L ${F(g.cx + g.waistHW + 2)} ${F(g.waistY)}`,
          'Z',
        ].join(' ')}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.6}
      />
      {/* pleats */}
      {[-0.5, 0, 0.5].map((t) => (
        <path
          key={t}
          d={`M ${F(g.cx + t * g.waistHW)} ${F(g.waistY + 12)} L ${F(g.cx + t * flare)} ${F(hemY - 4)}`}
          stroke={c.dark}
          strokeWidth={1.8}
          opacity={0.55}
        />
      ))}
      {waistband(c, 10)}
    </g>
  );
}

function Leggings({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      <GarmentShell c={c} d={seatD(g, 0)} />
      {([-1, 1] as const).map((s) => (
        <GarmentShell key={s} c={c} d={legD(g, s, g.hipY - 6, g.legHW + 1, g.ankleY, 9.5)} />
      ))}
      {waistband(c, 13)}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Dresses
// ---------------------------------------------------------------------------

function dressBodice(g: BodyGeom, neckDrop: number): string {
  return torsoD(g, g.waistY + 8, 0, neckDrop);
}

function dressSkirtD(g: BodyGeom, hemY: number, flare: number): string {
  const { cx, waistY, waistHW } = g;
  return [
    `M ${F(cx - waistHW)} ${F(waistY)}`,
    `C ${F(cx - waistHW - 14)} ${F(waistY + 60)}, ${F(cx - flare)} ${F(hemY - 40)}, ${F(cx - flare)} ${F(hemY)}`,
    `Q ${F(cx)} ${F(hemY + 10)} ${F(cx + flare)} ${F(hemY)}`,
    `C ${F(cx + flare)} ${F(hemY - 40)}, ${F(cx + waistHW + 14)} ${F(waistY + 60)}, ${F(cx + waistHW)} ${F(waistY)}`,
    'Z',
  ].join(' ');
}

function CasualDress({ c }: { c: Ctx }) {
  const { g } = c;
  const strapX = g.neckHW + 12;
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <rect key={s} x={F(g.cx + s * strapX - 7)} y={F(g.shoulderY - 2)} width={14} height={F(g.chestY - g.shoulderY)} rx={4} fill={c.fill} stroke={c.stroke} strokeWidth={1.4} />
      ))}
      <GarmentShell c={c} d={dressBodice(g, 30)} />
      <GarmentShell c={c} d={dressSkirtD(g, g.kneeY - 8, g.waistHW + 32)}>
        <path d={`M ${F(g.cx - g.waistHW)} ${F(g.waistY)} L ${F(g.cx + g.waistHW)} ${F(g.waistY)}`} stroke={c.darker} strokeWidth={2.4} />
      </GarmentShell>
    </g>
  );
}

function MaxiDress({ c }: { c: Ctx }) {
  const { g } = c;
  const strapX = g.neckHW + 12;
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <rect key={s} x={F(g.cx + s * strapX - 7)} y={F(g.shoulderY - 2)} width={14} height={F(g.chestY - g.shoulderY)} rx={4} fill={c.fill} stroke={c.stroke} strokeWidth={1.4} />
      ))}
      <GarmentShell c={c} d={dressBodice(g, 26)} />
      <GarmentShell c={c} d={dressSkirtD(g, g.ankleY - 4, g.waistHW + 40)}>
        {[-0.6, -0.2, 0.2, 0.6].map((t) => (
          <path key={t} d={`M ${F(g.cx + t * g.waistHW)} ${F(g.waistY + 30)} q ${F(t * 14)} 90 ${F(t * 26)} 190`} stroke={c.dark} strokeWidth={1.8} fill="none" opacity={0.5} />
        ))}
      </GarmentShell>
    </g>
  );
}

function Saree({ c }: { c: Ctx }) {
  const { g } = c;
  const { cx } = g;
  return (
    <g>
      {/* underskirt */}
      <GarmentShell c={c} d={dressSkirtD(g, g.ankleY - 4, g.waistHW + 26)} />
      {/* blouse */}
      <GarmentShell c={c} d={torsoD(g, g.waistY + 4, 0, 24)}>
        {([-1, 1] as const).map((s) => (
          <path key={s} d={shortSleeveD(g, s, 0.8)} fill={c.dark} stroke={c.stroke} strokeWidth={1.4} />
        ))}
      </GarmentShell>
      {/* drape across torso */}
      <path
        d={[
          `M ${F(cx + g.shoulderHW - 8)} ${F(g.shoulderY + 6)}`,
          `C ${F(cx + 10)} ${F(g.chestY)}, ${F(cx - 20)} ${F(g.waistY - 20)}, ${F(cx - g.waistHW - 2)} ${F(g.waistY + 26)}`,
          `L ${F(cx - g.waistHW + 18)} ${F(g.waistY + 34)}`,
          `C ${F(cx - 6)} ${F(g.waistY - 6)}, ${F(cx + 22)} ${F(g.chestY + 8)}, ${F(cx + g.shoulderHW - 2)} ${F(g.shoulderY + 22)}`,
          'Z',
        ].join(' ')}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.4}
        opacity={0.96}
      />
      {/* pallu over the shoulder */}
      <path
        d={[
          `M ${F(cx - g.shoulderHW + 2)} ${F(g.shoulderY + 2)}`,
          `L ${F(cx - g.shoulderHW - 14)} ${F(g.shoulderY + 10)}`,
          `L ${F(cx - g.shoulderHW - 6)} ${F(g.hipY + 26)}`,
          `L ${F(cx - g.shoulderHW + 12)} ${F(g.hipY + 22)}`,
          'Z',
        ].join(' ')}
        fill={c.dark}
        stroke={c.stroke}
        strokeWidth={1.4}
      />
      {/* border */}
      <path
        d={`M ${F(cx + g.shoulderHW - 14)} ${F(g.shoulderY + 26)} C ${F(cx)} ${F(g.chestY + 14)} ${F(cx - 24)} ${F(g.waistY - 8)} ${F(cx - g.waistHW + 6)} ${F(g.waistY + 30)}`}
        fill="none"
        stroke={c.light}
        strokeWidth={3.4}
        opacity={0.9}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Outerwear
// ---------------------------------------------------------------------------

function Blazer({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.hipY + 8;
  const nx = g.cx;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const { arm } = longSleeveD(g, s, g.wristY - 6);
        return <GarmentShell key={s} c={c} d={arm} />;
      })}
      {/* left panel */}
      <path
        d={[
          `M ${F(nx - g.shoulderHW + 2)} ${F(g.shoulderY + 2)}`,
          `Q ${F(nx - 14)} ${F(g.shoulderY + 40)} ${F(nx - 26)} ${F(g.chestY + 10)}`,
          `L ${F(nx - 30)} ${F(hemY)}`,
          `Q ${F(nx - 44)} ${F(hemY + 4)} ${F(nx - 58)} ${F(hemY - 4)}`,
          `L ${F(nx - g.shoulderHW - 2)} ${F(g.shoulderY + 30)}`,
          'Z',
        ].join(' ')}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.6}
      />
      {/* right panel (mirror) */}
      <path
        d={[
          `M ${F(nx + g.shoulderHW - 2)} ${F(g.shoulderY + 2)}`,
          `Q ${F(nx + 14)} ${F(g.shoulderY + 40)} ${F(nx + 26)} ${F(g.chestY + 10)}`,
          `L ${F(nx + 30)} ${F(hemY)}`,
          `Q ${F(nx + 44)} ${F(hemY + 4)} ${F(nx + 58)} ${F(hemY - 4)}`,
          `L ${F(nx + g.shoulderHW + 2)} ${F(g.shoulderY + 30)}`,
          'Z',
        ].join(' ')}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.6}
      />
      {/* lapels */}
      {([-1, 1] as const).map((s) => (
        <path
          key={s}
          d={`M ${F(nx + s * 10)} ${F(g.shoulderY + 8)} L ${F(nx + s * 34)} ${F(g.shoulderY + 44)} L ${F(nx + s * 22)} ${F(g.shoulderY + 66)} L ${F(nx + s * 4)} ${F(g.shoulderY + 34)} Z`}
          fill={c.light}
          stroke={c.stroke}
          strokeWidth={1.2}
        />
      ))}
      {/* button */}
      <circle cx={F(nx + 24)} cy={F(g.waistY + 6)} r={3.4} fill={c.darker} stroke={c.stroke} strokeWidth={1.2} />
    </g>
  );
}

function Jacket({ c }: { c: Ctx }) {
  const { g } = c;
  const hemY = g.waistY + 26;
  const nx = g.cx;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const { arm, cuffY } = longSleeveD(g, s, g.wristY - 10);
        const wx = g.cx + s * (g.shoulderHW - 10);
        return (
          <g key={s}>
            <GarmentShell c={c} d={arm} />
            <rect x={F(wx - g.armHW * 0.7 - 3)} y={F(cuffY - 2)} width={F((g.armHW * 0.7 + 3) * 2)} height={11} rx={3} fill={c.dark} stroke={c.stroke} strokeWidth={1.2} />
          </g>
        );
      })}
      <GarmentShell c={c} d={torsoD(g, hemY, 6, 10)}>
        {/* collar band */}
        <path
          d={`M ${F(nx - g.neckHW - 12)} ${F(g.shoulderY + 2)} Q ${F(nx)} ${F(g.shoulderY + 22)} ${F(nx + g.neckHW + 12)} ${F(g.shoulderY + 2)} L ${F(nx + g.neckHW + 8)} ${F(g.shoulderY - 6)} Q ${F(nx)} ${F(g.shoulderY + 8)} ${F(nx - g.neckHW - 8)} ${F(g.shoulderY - 6)} Z`}
          fill={c.dark}
          stroke={c.stroke}
          strokeWidth={1.4}
        />
        {/* zipper */}
        <rect x={F(nx - 2.5)} y={F(g.shoulderY + 18)} width={5} height={F(hemY - g.shoulderY - 18)} fill={c.darker} />
        <rect x={F(nx - 5)} y={F(g.shoulderY + 20)} width={10} height={7} rx={2} fill={c.light} stroke={c.stroke} strokeWidth={1} />
      </GarmentShell>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Shoes
// ---------------------------------------------------------------------------

function shoeBase(c: Ctx, s: -1 | 1, toeExt: number, topY: number): string {
  const { g } = c;
  const fx = g.cx + s * 7;
  return [
    `M ${F(fx - 14)} ${F(topY)}`,
    `Q ${F(fx - 16)} ${F(g.footY + 3)} ${F(fx - 2)} ${F(g.footY + 5)}`,
    `L ${F(fx + 8 + toeExt)} ${F(g.footY + 5)}`,
    `Q ${F(fx + 15 + toeExt)} ${F(g.footY + 2)} ${F(fx + 11)} ${F(topY - 2)}`,
    `Q ${F(fx)} ${F(topY - 8)} ${F(fx - 14)} ${F(topY)}`,
    'Z',
  ].join(' ');
}

function Sneakers({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const fx = g.cx + s * 7;
        return (
          <g key={s}>
            <path d={shoeBase(c, s, 0, g.ankleY - 6)} fill={c.fill} stroke={c.stroke} strokeWidth={1.6} />
            {/* sole */}
            <path
              d={`M ${F(fx - 15)} ${F(g.footY - 1)} Q ${F(fx)} ${F(g.footY + 6)} ${F(fx + 13)} ${F(g.footY - 1)} L ${F(fx + 13)} ${F(g.footY + 3)} Q ${F(fx)} ${F(g.footY + 9)} ${F(fx - 15)} ${F(g.footY + 3)} Z`}
              fill="#f4f1ea"
              stroke={c.stroke}
              strokeWidth={1.2}
            />
            {/* laces */}
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M ${F(fx - 6 + i * 2)} ${F(g.ankleY - 2 + i * 5)} l 12 ${-3 + i}`} stroke={c.darker} strokeWidth={2.2} strokeLinecap="round" />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function Heels({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const fx = g.cx + s * 7;
        return (
          <g key={s}>
            <path d={shoeBase(c, s, 7, g.ankleY - 8)} fill={c.fill} stroke={c.stroke} strokeWidth={1.6} />
            {/* heel */}
            <rect x={F(fx - 14)} y={F(g.footY - 2)} width={6} height={17} rx={2} fill={c.darker} stroke={c.stroke} strokeWidth={1.2} />
            {/* ankle strap */}
            <path d={`M ${F(fx - 13)} ${F(g.ankleY - 10)} Q ${F(fx)} ${F(g.ankleY - 4)} ${F(fx + 11)} ${F(g.ankleY - 10)}`} fill="none" stroke={c.darker} strokeWidth={2.6} />
          </g>
        );
      })}
    </g>
  );
}

function Sandals({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const fx = g.cx + s * 7;
        return (
          <g key={s}>
            {/* sole */}
            <path d={shoeBase(c, s, 2, g.ankleY + 2)} fill={shade('#8a6b4a', 0)} stroke={c.stroke} strokeWidth={1.6} opacity={0.95} />
            {/* straps */}
            <path d={`M ${F(fx - 12)} ${F(g.ankleY + 4)} Q ${F(fx)} ${F(g.ankleY - 8)} ${F(fx + 12)} ${F(g.ankleY + 4)}`} fill="none" stroke={c.fill} strokeWidth={5} strokeLinecap="round" />
            <path d={`M ${F(fx - 10)} ${F(g.footY - 2)} Q ${F(fx + 2)} ${F(g.footY - 10)} ${F(fx + 12)} ${F(g.footY - 3)}`} fill="none" stroke={c.fill} strokeWidth={5} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

function Boots({ c }: { c: Ctx }) {
  const { g } = c;
  const shaftTop = g.kneeY + 52;
  return (
    <g>
      {([-1, 1] as const).map((s) => {
        const fx = g.cx + s * 7;
        return (
          <g key={s}>
            <path d={shoeBase(c, s, 3, g.ankleY - 4)} fill={c.fill} stroke={c.stroke} strokeWidth={1.6} />
            {/* shaft */}
            <path
              d={`M ${F(fx - 14)} ${F(shaftTop)} L ${F(fx - 13)} ${F(g.ankleY - 2)} L ${F(fx + 11)} ${F(g.ankleY - 2)} L ${F(fx + 12)} ${F(shaftTop)} Q ${F(fx)} ${F(shaftTop + 8)} ${F(fx - 14)} ${F(shaftTop)} Z`}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={1.6}
            />
            <path d={`M ${F(fx - 14)} ${F(shaftTop + 4)} Q ${F(fx)} ${F(shaftTop + 11)} ${F(fx + 12)} ${F(shaftTop + 4)}`} fill="none" stroke={c.darker} strokeWidth={2.4} />
            {/* sole */}
            <rect x={F(fx - 15)} y={F(g.footY + 1)} width={30} height={5} rx={2.5} fill={c.darker} />
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------

function Watch({ c }: { c: Ctx }) {
  const { g } = c;
  const wx = g.cx - (g.shoulderHW - 10);
  const wy = g.wristY - 16;
  return (
    <g>
      <rect x={F(wx - g.armHW - 1)} y={F(wy - 7)} width={F((g.armHW + 1) * 2)} height={14} rx={5} fill={c.dark} stroke={c.stroke} strokeWidth={1.2} />
      <circle cx={F(wx)} cy={F(wy)} r={8.5} fill="#f7f4ee" stroke={c.stroke} strokeWidth={1.6} />
      <path d={`M ${F(wx)} ${F(wy)} L ${F(wx)} ${F(wy - 5)} M ${F(wx)} ${F(wy)} L ${F(wx + 3.5)} ${F(wy + 2)}`} stroke="#333" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

function Sunglasses({ c, config }: { c: Ctx; config: AvatarConfig }) {
  const lm = faceLandmarks(c.g);
  const lensW = 24;
  const lensH = 15;
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <rect
          key={s}
          x={F(lm.cx + s * lm.ex - lensW / 2)}
          y={F(lm.eyeY - lensH / 2)}
          width={lensW}
          height={lensH}
          rx={6}
          fill="#23272e"
          opacity={0.92}
          stroke={c.stroke}
          strokeWidth={1.4}
        />
      ))}
      <path d={`M ${F(lm.cx - lm.ex + lensW / 2)} ${F(lm.eyeY - 2)} Q ${F(lm.cx)} ${F(lm.eyeY - 8)} ${F(lm.cx + lm.ex - lensW / 2)} ${F(lm.eyeY - 2)}`} fill="none" stroke={c.stroke} strokeWidth={2.4} />
      {/* shine */}
      {([-1, 1] as const).map((s) => (
        <path key={s} d={`M ${F(lm.cx + s * lm.ex - 6)} ${F(lm.eyeY + 4)} l 8 -9`} stroke="#ffffff" strokeWidth={2.4} opacity={0.55} strokeLinecap="round" />
      ))}
      {void config}
    </g>
  );
}

function Cap({ c }: { c: Ctx }) {
  const { g } = c;
  const crownY = g.headCy - g.headRy;
  return (
    <g>
      <path
        d={`M ${F(g.cx - g.headRx - 3)} ${F(g.headCy - 12)} Q ${F(g.cx - g.headRx)} ${F(crownY - 20)} ${F(g.cx)} ${F(crownY - 22)} Q ${F(g.cx + g.headRx)} ${F(crownY - 20)} ${F(g.cx + g.headRx + 3)} ${F(g.headCy - 12)} Q ${F(g.cx)} ${F(g.headCy - 22)} ${F(g.cx - g.headRx - 3)} ${F(g.headCy - 12)} Z`}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.6}
      />
      <circle cx={F(g.cx)} cy={F(crownY - 22)} r={3.4} fill={c.darker} />
      {/* brim */}
      <ellipse cx={F(g.cx)} cy={F(g.headCy - 10)} rx={F(g.headRx + 16)} ry={7} fill={c.dark} stroke={c.stroke} strokeWidth={1.4} />
    </g>
  );
}

function Hat({ c }: { c: Ctx }) {
  const { g } = c;
  const crownY = g.headCy - g.headRy;
  return (
    <g>
      <ellipse cx={F(g.cx)} cy={F(crownY + 6)} rx={F(g.headRx + 26)} ry={11} fill={c.dark} stroke={c.stroke} strokeWidth={1.6} />
      <path
        d={`M ${F(g.cx - 27)} ${F(crownY + 4)} L ${F(g.cx - 23)} ${F(crownY - 30)} Q ${F(g.cx)} ${F(crownY - 38)} ${F(g.cx + 23)} ${F(crownY - 30)} L ${F(g.cx + 27)} ${F(crownY + 4)} Z`}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.6}
      />
      <rect x={F(g.cx - 25)} y={F(crownY - 8)} width={50} height={9} fill={c.darker} opacity={0.8} />
    </g>
  );
}

function Belt({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      <rect x={F(g.cx - g.waistHW - 4)} y={F(g.waistY - 3)} width={F((g.waistHW + 4) * 2)} height={11} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={1.4} />
      <rect x={F(g.cx - 9)} y={F(g.waistY - 5)} width={18} height={15} rx={3} fill="none" stroke={c.light} strokeWidth={3} />
    </g>
  );
}

function Necklace({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 16;
  return (
    <g>
      <path d={`M ${F(g.cx - g.neckHW - 8)} ${F(y - 8)} Q ${F(g.cx)} ${F(y + 16)} ${F(g.cx + g.neckHW + 8)} ${F(y - 8)}`} fill="none" stroke={c.fill} strokeWidth={3} />
      <circle cx={F(g.cx)} cy={F(y + 14)} r={4.4} fill={c.light} stroke={c.stroke} strokeWidth={1.2} />
    </g>
  );
}

function Earrings({ c }: { c: Ctx }) {
  const lm = faceLandmarks(c.g);
  return (
    <g>
      {([-1, 1] as const).map((s) => (
        <g key={s}>
          <circle cx={F(lm.cx + s * (lm.earX - 1))} cy={F(lm.earY + 4)} r={3.2} fill={c.light} stroke={c.stroke} strokeWidth={1} />
          <circle cx={F(lm.cx + s * (lm.earX - 1))} cy={F(lm.earY + 11)} r={2.2} fill={c.fill} stroke={c.stroke} strokeWidth={1} />
        </g>
      ))}
    </g>
  );
}

function Scarf({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckTopY + 14;
  return (
    <g>
      <rect x={F(g.cx - g.neckHW - 12)} y={F(y - 9)} width={F((g.neckHW + 12) * 2)} height={19} rx={9.5} fill={c.fill} stroke={c.stroke} strokeWidth={1.6} />
      <path
        d={`M ${F(g.cx + 2)} ${F(y + 8)} L ${F(g.cx + 20)} ${F(y + 8)} L ${F(g.cx + 14)} ${F(g.chestY + 6)} L ${F(g.cx - 2)} ${F(g.chestY + 6)} Z`}
        fill={c.dark}
        stroke={c.stroke}
        strokeWidth={1.4}
      />
      <path
        d={`M ${F(g.cx - 10)} ${F(y + 8)} L ${F(g.cx + 8)} ${F(y + 8)} L ${F(g.cx + 10)} ${F(g.chestY - 6)} L ${F(g.cx - 12)} ${F(g.chestY - 6)} Z`}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.4}
      />
    </g>
  );
}

function Tie({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 4;
  return (
    <g>
      <path
        d={`M ${F(g.cx - 8)} ${F(y)} L ${F(g.cx + 8)} ${F(y)} L ${F(g.cx + 5)} ${F(y + 16)} L ${F(g.cx - 5)} ${F(y + 16)} Z`}
        fill={c.darker}
        stroke={c.stroke}
        strokeWidth={1.2}
      />
      <path
        d={`M ${F(g.cx - 5)} ${F(y + 16)} L ${F(g.cx + 5)} ${F(y + 16)} L ${F(g.cx + 11)} ${F(g.waistY - 14)} L ${F(g.cx)} ${F(g.waistY + 2)} L ${F(g.cx - 11)} ${F(g.waistY - 14)} Z`}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.4}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------

const RENDERERS: Record<string, (c: Ctx, config: AvatarConfig) => React.ReactNode> = {
  tshirt: (c) => <TShirt c={c} />,
  polo: (c) => <Polo c={c} />,
  shirt: (c) => <Shirt c={c} />,
  hoodie: (c) => <Hoodie c={c} />,
  kurta: (c) => <Kurta c={c} />,
  blouse: (c) => <Blouse c={c} />,
  tanktop: (c) => <TankTop c={c} />,
  sweater: (c) => <Sweater c={c} />,
  jeans: (c) => <Jeans c={c} />,
  chinos: (c) => <Chinos c={c} />,
  shorts: (c) => <Shorts c={c} />,
  skirt: (c) => <Skirt c={c} />,
  leggings: (c) => <Leggings c={c} />,
  'dress-casual': (c) => <CasualDress c={c} />,
  'dress-maxi': (c) => <MaxiDress c={c} />,
  'dress-saree': (c) => <Saree c={c} />,
  blazer: (c) => <Blazer c={c} />,
  jacket: (c) => <Jacket c={c} />,
  sneakers: (c) => <Sneakers c={c} />,
  heels: (c) => <Heels c={c} />,
  sandals: (c) => <Sandals c={c} />,
  boots: (c) => <Boots c={c} />,
  watch: (c) => <Watch c={c} />,
  sunglasses: (c, config) => <Sunglasses c={c} config={config} />,
  cap: (c) => <Cap c={c} />,
  hat: (c) => <Hat c={c} />,
  belt: (c) => <Belt c={c} />,
  necklace: (c) => <Necklace c={c} />,
  earrings: (c) => <Earrings c={c} />,
  scarf: (c) => <Scarf c={c} />,
  tie: (c) => <Tie c={c} />,
};

/**
 * Render one garment/accessory parametrically onto the body geometry.
 * Never touches identity layers (face/skin/hair) — those are drawn separately.
 */
export function renderGarment(props: GarmentProps): React.ReactNode {
  const { garmentId, colorway, geom, config, uid } = props;
  const renderer = RENDERERS[garmentId];
  if (!renderer) return null;
  const c = ctxFor(colorway, geom, uid);
  return (
    <g key={`${uid}-${garmentId}`} data-garment={garmentId}>
      {renderer(c, config)}
    </g>
  );
}

/** All garment ids the renderer supports. */
export function supportedGarments(): string[] {
  return Object.keys(RENDERERS);
}
