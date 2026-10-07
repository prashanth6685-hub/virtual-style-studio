import type { Colorway } from '@vss/shared';
import type { AvatarConfig } from './types';
import type { BodyGeom } from './body';
import { smoothPath, armJoints, wristX } from './body';
import { faceLandmarks } from './face';
import { fillFor, shade } from '../lib/color';
import { fabricId } from './ids';

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
  hat: 'Hat',
  belt: 'Belt',
  necklace: 'Necklace',
  earrings: 'Earrings',
  scarf: 'Scarf',
  tie: 'Tie',
};

interface Ctx {
  g: BodyGeom;
  config: AvatarConfig;
  fill: string;
  base: string;
  dark: string;
  darker: string;
  light: string;
  stroke: string;
  uid: string;
  garmentId: string;
  /** url(#…) of this garment's fabric cylinder shading (defined in its own <defs>) */
  fab: string;
}

function ctxFor(colorway: Colorway, g: BodyGeom, uid: string, garmentId: string, config: AvatarConfig): Ctx {
  const { fill } = fillFor(colorway, uid);
  const base = colorway.base;
  return {
    g, config, fill, base,
    dark: shade(base, -14),
    darker: shade(base, -30),
    light: shade(base, 20),
    stroke: shade(base, -34),
    uid,
    garmentId,
    fab: `url(#${fabricId(uid, garmentId)})`,
  };
}

/** Per-garment defs: fabric cylinder shading that works over any base/pattern. */
function FabricDefs({ c }: { c: Ctx }) {
  return (
    <defs>
      <linearGradient id={fabricId(c.uid, c.garmentId)} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000000" stopOpacity="0.24" />
        <stop offset="0.3" stopColor="#000000" stopOpacity="0" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.13" />
        <stop offset="0.7" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.24" />
      </linearGradient>
    </defs>
  );
}

/** Body half-width at height y (for tops): shoulder → chest → waist → hip. */
function torsoHW(g: BodyGeom, y: number, ease: number): number {
  const pts: [number, number][] = [
    [g.shoulderY - 4, g.shoulderHW],
    [g.chestY, g.chestHW],
    [g.waistY, g.waistHW],
    [g.hipY, g.hipHW],
    [g.hipY + 30, g.hipHW * 0.98],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, w0] = pts[i];
    const [y1, w1] = pts[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0);
      return w0 + (w1 - w0) * t + ease;
    }
  }
  return (y < pts[0][0] ? pts[0][1] : pts[pts.length - 1][1]) + ease;
}

/** Soft fold strokes. */
function Folds({ d, c, w = 2.4, o = 0.4 }: { d: string[]; c: Ctx; w?: number; o?: number }) {
  return (
    <g fill="none" stroke={c.darker} strokeWidth={w} opacity={o} strokeLinecap="round">
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Tops
// ---------------------------------------------------------------------------

/** Short sleeve following the upper arm. */
function ShortSleeve({ c, side }: { c: Ctx; side: -1 | 1 }) {
  const { g } = c;
  const s = side;
  const sx = g.cx + s * (g.shoulderHW - 3);
  const d = smoothPath(
    [
      [sx + s * 2, g.shoulderY - 2],
      [sx + s * (g.upperArmHW + 7), g.shoulderY + 34],
      [sx + s * (g.upperArmHW + 2), g.shoulderY + 62],
      [sx - s * (g.upperArmHW - 4), g.shoulderY + 58],
      [sx - s * 4, g.shoulderY + 22],
    ],
    true,
  );
  return (
    <g>
      <path d={d} fill={c.fill} />
      <path d={d} fill={c.fab} />
      <path
        d={`M ${sx + s * (g.upperArmHW + 4)} ${g.shoulderY + 52} Q ${sx + s * 2} ${g.shoulderY + 60} ${sx - s * (g.upperArmHW - 5)} ${g.shoulderY + 50}`}
        fill="none"
        stroke={c.darker}
        strokeWidth={3}
        opacity={0.65}
      />
    </g>
  );
}

/** Long sleeve tapering down the arm to the wrist (tracks armJoints). */
function LongSleeve({ c, side, cuffColor }: { c: Ctx; side: -1 | 1; cuffColor?: string }) {
  const { g } = c;
  const s = side;
  const j = armJoints(g, side);
  const j0x = j.j0x;
  const j1x = j.j1x;
  const j2x = j.j2x;
  const e = 4;
  const d = smoothPath(
    [
      [j0x + s * (g.upperArmHW + e), j.j0y - 4],
      [j1x + s * (g.elbowHW + e), g.elbowY],
      [j2x + s * (g.wristHW + e), g.wristY - 6],
      [j2x - s * (g.wristHW + e - 1), g.wristY - 6],
      [j1x - s * (g.elbowHW + e), g.elbowY],
      [j0x - s * (g.upperArmHW + e - 2), j.j0y + 4],
    ],
    true,
  );
  return (
    <g>
      <path d={d} fill={c.fill} />
      <path d={d} fill={c.fab} />
      <path d={`M ${j1x - s * (g.elbowHW + e) + 3} ${g.elbowY - 4} q ${s * 7} 5 ${s * 2} 10`} fill="none" stroke={c.darker} strokeWidth={2} opacity={0.45} strokeLinecap="round" />
      <path
        d={`M ${j2x + s * (g.wristHW + e)} ${g.wristY - 14} Q ${j2x} ${g.wristY - 8} ${j2x - s * (g.wristHW + e - 1)} ${g.wristY - 14} L ${j2x - s * (g.wristHW + e - 1)} ${g.wristY - 6} Q ${j2x} ${g.wristY} ${j2x + s * (g.wristHW + e)} ${g.wristY - 6} Z`}
        fill={cuffColor ?? c.dark}
        opacity={0.9}
      />
    </g>
  );
}

/** Torso block for tops. */
function TopBody({
  c,
  hemY,
  ease = 5,
  neckline,
}: {
  c: Ctx;
  hemY: number;
  ease?: number;
  neckline: React.ReactNode;
}) {
  const { g } = c;
  const topY = g.shoulderY - 4;
  const d = smoothPath(
    [
      [g.cx - torsoHW(g, topY, ease - 2), topY],
      [g.cx - torsoHW(g, g.chestY, ease), g.chestY],
      [g.cx - torsoHW(g, g.waistY, ease), g.waistY],
      [g.cx - torsoHW(g, g.hipY, ease), g.hipY],
      [g.cx - torsoHW(g, hemY, ease - 1), hemY],
      [g.cx, hemY + 5],
      [g.cx + torsoHW(g, hemY, ease - 1), hemY],
      [g.cx + torsoHW(g, g.hipY, ease), g.hipY],
      [g.cx + torsoHW(g, g.waistY, ease), g.waistY],
      [g.cx + torsoHW(g, g.chestY, ease), g.chestY],
      [g.cx + torsoHW(g, topY, ease - 2), topY],
    ],
    true,
  );
  return (
    <g>
      <path d={d} fill={c.fill} />
      <path d={d} fill={c.fab} />
      {neckline}
      <path
        d={`M ${g.cx - torsoHW(g, hemY, ease - 1)} ${hemY - 7} Q ${g.cx} ${hemY - 2} ${g.cx + torsoHW(g, hemY, ease - 1)} ${hemY - 7}`}
        fill="none"
        stroke={c.darker}
        strokeWidth={2.6}
        opacity={0.6}
      />
      <Folds
        c={c}
        d={[
          `M ${g.cx - torsoHW(g, g.waistY, ease) + 8} ${g.waistY - 22} q -3 14 -1 30`,
          `M ${g.cx + torsoHW(g, g.waistY, ease) - 8} ${g.waistY - 22} q 3 14 1 30`,
          `M ${g.cx - 14} ${hemY - 34} q -2 12 1 24`,
          `M ${g.cx + 14} ${hemY - 34} q 2 12 -1 24`,
        ]}
      />
    </g>
  );
}

/** Crew neckline: ribbed band + inner shadow. */
function CrewNeck({ c, drop = 12 }: { c: Ctx; drop?: number }) {
  const { g } = c;
  const y = g.neckBotY + 2;
  const hw = g.neckHW + 7;
  return (
    <g>
      <path
        d={`M ${g.cx - hw} ${y} Q ${g.cx} ${y + drop + 8} ${g.cx + hw} ${y} L ${g.cx + hw - 4} ${y + 7} Q ${g.cx} ${y + drop + 13} ${g.cx - hw + 4} ${y + 7} Z`}
        fill={c.dark}
      />
      <path d={`M ${g.cx - hw + 2} ${y + 2} Q ${g.cx} ${y + drop + 9} ${g.cx + hw - 2} ${y + 2}`} fill="none" stroke={c.darker} strokeWidth={1.6} opacity={0.7} />
    </g>
  );
}

function Tshirt({ c }: { c: Ctx }) {
  return (
    <g>
      <FabricDefs c={c} />
      <ShortSleeve c={c} side={-1} />
      <ShortSleeve c={c} side={1} />
      <TopBody c={c} hemY={c.g.hipY + 10} neckline={<CrewNeck c={c} />} />
    </g>
  );
}

function Polo({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 2;
  return (
    <g>
      <FabricDefs c={c} />
      <ShortSleeve c={c} side={-1} />
      <ShortSleeve c={c} side={1} />
      <TopBody
        c={c}
        hemY={g.hipY + 10}
        neckline={
          <g>
            <path d={`M ${g.cx - g.neckHW - 8} ${y - 4} L ${g.cx - 3} ${y + 16} L ${g.cx - g.neckHW - 2} ${y + 10} Z`} fill={c.dark} />
            <path d={`M ${g.cx + g.neckHW + 8} ${y - 4} L ${g.cx + 3} ${y + 16} L ${g.cx + g.neckHW + 2} ${y + 10} Z`} fill={c.dark} />
            <rect x={g.cx - 4} y={y + 8} width={8} height={30} fill={c.dark} opacity={0.55} />
            <circle cx={g.cx} cy={y + 18} r={2.4} fill={c.light} stroke={c.darker} strokeWidth={0.8} />
            <circle cx={g.cx} cy={y + 30} r={2.4} fill={c.light} stroke={c.darker} strokeWidth={0.8} />
          </g>
        }
      />
    </g>
  );
}

function Shirt({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 2;
  return (
    <g>
      <FabricDefs c={c} />
      <LongSleeve c={c} side={-1} />
      <LongSleeve c={c} side={1} />
      <TopBody
        c={c}
        hemY={g.hipY + 26}
        ease={6}
        neckline={
          <g>
            <path d={`M ${g.cx - g.neckHW - 9} ${y - 6} L ${g.cx - 4} ${y + 14} L ${g.cx - g.neckHW - 1} ${y + 8} Z`} fill={c.light} stroke={c.darker} strokeWidth={1} />
            <path d={`M ${g.cx + g.neckHW + 9} ${y - 6} L ${g.cx + 4} ${y + 14} L ${g.cx + g.neckHW + 1} ${y + 8} Z`} fill={c.light} stroke={c.darker} strokeWidth={1} />
            <rect x={g.cx - 5} y={y + 6} width={10} height={g.hipY + 18 - y} fill={c.dark} opacity={0.4} />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <circle cx={g.cx} cy={y + 26 + i * 26} r={2.6} fill={c.light} stroke={c.darker} strokeWidth={0.9} />
                <circle cx={g.cx} cy={y + 26 + i * 26} r={0.7} fill={c.darker} />
              </g>
            ))}
          </g>
        }
      />
    </g>
  );
}

function Hoodie({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY;
  return (
    <g>
      <FabricDefs c={c} />
      <path
        d={`M ${g.cx - g.neckHW - 16} ${y - 6} Q ${g.cx} ${y - 30} ${g.cx + g.neckHW + 16} ${y - 6} Q ${g.cx} ${y + 2} ${g.cx - g.neckHW - 16} ${y - 6} Z`}
        fill={c.dark}
      />
      <path d={`M ${g.cx - g.neckHW - 16} ${y - 6} Q ${g.cx} ${y - 30} ${g.cx + g.neckHW + 16} ${y - 6}`} fill="none" stroke={c.darker} strokeWidth={2} opacity={0.6} />
      <LongSleeve c={c} side={-1} />
      <LongSleeve c={c} side={1} />
      <TopBody
        c={c}
        hemY={g.hipY + 30}
        ease={10}
        neckline={
          <g>
            <path d={`M ${g.cx - 8} ${y + 12} q -2 14 1 26 M ${g.cx + 8} ${y + 12} q 2 14 -1 26`} stroke={c.light} strokeWidth={3} fill="none" strokeLinecap="round" />
            <circle cx={g.cx - 7} cy={y + 40} r={2.6} fill={c.darker} />
            <circle cx={g.cx + 7} cy={y + 40} r={2.6} fill={c.darker} />
            <path
              d={`M ${g.cx - 30} ${g.waistY + 6} L ${g.cx + 30} ${g.waistY + 6} L ${g.cx + 24} ${g.waistY + 44} L ${g.cx - 24} ${g.waistY + 44} Z`}
              fill={c.dark}
              opacity={0.5}
            />
            <path d={`M ${g.cx - 30} ${g.waistY + 6} L ${g.cx - 24} ${g.waistY + 44} M ${g.cx + 30} ${g.waistY + 6} L ${g.cx + 24} ${g.waistY + 44}`} stroke={c.darker} strokeWidth={1.6} opacity={0.7} />
          </g>
        }
      />
    </g>
  );
}

function Kurta({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 2;
  const hemY = g.kneeY - 24;
  return (
    <g>
      <FabricDefs c={c} />
      <LongSleeve c={c} side={-1} />
      <LongSleeve c={c} side={1} />
      <TopBody
        c={c}
        hemY={hemY}
        ease={9}
        neckline={
          <g>
            <path d={`M ${g.cx - g.neckHW - 6} ${y - 2} Q ${g.cx} ${y + 8} ${g.cx + g.neckHW + 6} ${y - 2} L ${g.cx + g.neckHW + 6} ${y + 6} Q ${g.cx} ${y + 15} ${g.cx - g.neckHW - 6} ${y + 6} Z`} fill={c.dark} />
            <rect x={g.cx - 4} y={y + 10} width={8} height={44} fill={c.dark} opacity={0.5} />
            {[0, 1].map((i) => (
              <circle key={i} cx={g.cx} cy={y + 24 + i * 18} r={2.4} fill={c.light} stroke={c.darker} strokeWidth={0.8} />
            ))}
          </g>
        }
      />
      <path d={`M ${g.cx - torsoHW(g, hemY, 8)} ${hemY - 34} L ${g.cx - torsoHW(g, hemY, 8) + 3} ${hemY + 2} M ${g.cx + torsoHW(g, hemY, 8)} ${hemY - 34} L ${g.cx + torsoHW(g, hemY, 8) - 3} ${hemY + 2}`} stroke={c.darker} strokeWidth={2} opacity={0.7} />
      <Folds c={c} d={[`M ${g.cx - 20} ${g.waistY + 20} q -3 30 -1 62`, `M ${g.cx + 20} ${g.waistY + 20} q 3 30 1 62`, `M ${g.cx} ${g.hipY + 10} q -2 26 0 52`]} />
    </g>
  );
}

function Blouse({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 4;
  return (
    <g>
      <FabricDefs c={c} />
      <ShortSleeve c={c} side={-1} />
      <ShortSleeve c={c} side={1} />
      <TopBody
        c={c}
        hemY={g.waistY + 26}
        ease={6}
        neckline={
          <g>
            <path d={`M ${g.cx - g.neckHW - 8} ${y - 4} Q ${g.cx} ${y + 26} ${g.cx + g.neckHW + 8} ${y - 4} L ${g.cx + g.neckHW + 4} ${y + 2} Q ${g.cx} ${y + 30} ${g.cx - g.neckHW - 4} ${y + 2} Z`} fill={c.dark} opacity={0.85} />
            <path d={`M ${g.cx - g.bustHW * 0.5} ${g.bustY + 8} q -4 10 -2 20 M ${g.cx + g.bustHW * 0.5} ${g.bustY + 8} q 4 10 2 20`} stroke={c.darker} strokeWidth={1.6} fill="none" opacity={0.55} />
          </g>
        }
      />
    </g>
  );
}

function Tanktop({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 4;
  const strapW = 9;
  return (
    <g>
      <FabricDefs c={c} />
      <path d={`M ${g.cx - g.neckHW - 10} ${y - 6} L ${g.cx - g.neckHW - 6} ${y + 34} L ${g.cx - g.neckHW - 6 + strapW} ${y + 34} L ${g.cx - g.neckHW - 10 + strapW} ${y - 6} Z`} fill={c.fill} />
      <path d={`M ${g.cx + g.neckHW + 10} ${y - 6} L ${g.cx + g.neckHW + 6} ${y + 34} L ${g.cx + g.neckHW + 6 - strapW} ${y + 34} L ${g.cx + g.neckHW + 10 - strapW} ${y - 6} Z`} fill={c.fill} />
      <TopBody
        c={c}
        hemY={g.waistY + 24}
        ease={4}
        neckline={
          <path d={`M ${g.cx - g.neckHW - 8} ${y} Q ${g.cx} ${y + 30} ${g.cx + g.neckHW + 8} ${y} L ${g.cx + g.neckHW + 4} ${y + 6} Q ${g.cx} ${y + 34} ${g.cx - g.neckHW - 4} ${y + 6} Z`} fill={c.dark} opacity={0.85} />
        }
      />
    </g>
  );
}

function Sweater({ c }: { c: Ctx }) {
  return (
    <g>
      <FabricDefs c={c} />
      <LongSleeve c={c} side={-1} />
      <LongSleeve c={c} side={1} />
      <TopBody
        c={c}
        hemY={c.g.hipY + 24}
        ease={8}
        neckline={
          <g>
            <path d={`M ${c.g.cx - c.g.neckHW - 7} ${c.g.neckBotY - 2} Q ${c.g.cx} ${c.g.neckBotY + 16} ${c.g.cx + c.g.neckHW + 7} ${c.g.neckBotY - 2} L ${c.g.cx + c.g.neckHW + 3} ${c.g.neckBotY + 4} Q ${c.g.cx} ${c.g.neckBotY + 20} ${c.g.cx - c.g.neckHW - 3} ${c.g.neckBotY + 4} Z`} fill={c.dark} />
            {[-24, -12, 0, 12, 24].map((dx) => (
              <path key={dx} d={`M ${c.g.cx + dx} ${c.g.chestY - 20} L ${c.g.cx + dx} ${c.g.waistY + 20}`} stroke={c.darker} strokeWidth={1.4} opacity={0.35} />
            ))}
          </g>
        }
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Bottoms
// ---------------------------------------------------------------------------

/** One pant leg: mirrors the skin leg stations with ease. */
function PantLeg({ c, side, topY, hemY, ease = 5 }: { c: Ctx; side: -1 | 1; topY: number; hemY: number; ease?: number }) {
  const { g } = c;
  const s = side;
  // skin leg stations [y, center, radius] — must match body.ts legPath
  const skin: [number, number, number][] = [
    [g.hipY + 4, 17, 15],
    [g.hipY + (g.kneeY - g.hipY) * 0.45, 15, 14],
    [g.kneeY, 9, 8],
    [g.calfY, 8, 10],
    [g.ankleY, 4.5, 6.5],
  ];
  const yFor = (y: number): [number, number] => {
    for (let i = 0; i < skin.length - 1; i++) {
      const [y0, c0, r0] = skin[i];
      const [y1, c1, r1] = skin[i + 1];
      if (y >= y0 && y <= y1) {
        const t = (y - y0) / (y1 - y0);
        return [c0 + (c1 - c0) * t, r0 + (r1 - r0) * t];
      }
    }
    return y < skin[0][0] ? [skin[0][1], skin[0][2]] : [skin[skin.length-1][1], skin[skin.length-1][2]];
  };
  const ys = [topY, (topY + hemY) / 2, hemY];
  const outer: [number, number][] = ys.map((y): [number, number] => { const [cc, rr] = yFor(y); return [g.cx + s * (cc + rr + ease), y]; });
  const inner: [number, number][] = ys.map((y): [number, number] => { const [cc, rr] = yFor(y); return [g.cx + s * Math.max(1.5, cc - rr - ease * 0.6), y]; }).reverse();
  // close across the top
  const topClose: [number, number][] = [[g.cx + s * 2, topY - 6]];
  const d = smoothPath([...outer, ...inner, ...topClose], true);
  return (
    <g>
      <path d={d} fill={c.fill} />
      <path d={d} fill={c.fab} />
    </g>
  );
}

/** Waistband across the waist. */
function Waistband({ c, topY, h = 12 }: { c: Ctx; topY: number; h?: number }) {
  const { g } = c;
  const w = g.waistHW + 6;
  return (
    <g>
      <path d={`M ${g.cx - w} ${topY} L ${g.cx + w} ${topY} L ${g.cx + w - 1} ${topY + h} L ${g.cx - w + 1} ${topY + h} Z`} fill={c.dark} />
      <path d={`M ${g.cx - w} ${topY + h} L ${g.cx + w} ${topY + h}`} stroke={c.darker} strokeWidth={1.6} opacity={0.7} />
    </g>
  );
}

function Jeans({ c }: { c: Ctx }) {
  const { g } = c;
  const topY = g.waistY - 8;
  const hemY = g.ankleY - 4;
  return (
    <g>
      <FabricDefs c={c} />
      <PantLeg c={c} side={-1} topY={topY} hemY={hemY} />
      <PantLeg c={c} side={1} topY={topY} hemY={hemY} />
      <Waistband c={c} topY={topY} />
      {/* fly + button */}
      <path d={`M ${g.cx} ${topY + 12} L ${g.cx} ${topY + 40} M ${g.cx} ${topY + 40} q 8 4 12 12`} stroke={c.darker} strokeWidth={1.8} fill="none" opacity={0.7} />
      <circle cx={g.cx} cy={topY + 6} r={2.6} fill={c.light} stroke={c.darker} strokeWidth={0.9} />
      {/* pockets */}
      <path d={`M ${g.cx - g.waistHW - 2} ${topY + 12} Q ${g.cx - g.waistHW + 12} ${topY + 22} ${g.cx - g.waistHW + 16} ${topY + 38}`} stroke={c.darker} strokeWidth={1.8} fill="none" opacity={0.65} />
      <path d={`M ${g.cx + g.waistHW + 2} ${topY + 12} Q ${g.cx + g.waistHW - 12} ${topY + 22} ${g.cx + g.waistHW - 16} ${topY + 38}`} stroke={c.darker} strokeWidth={1.8} fill="none" opacity={0.65} />
      {/* knee folds + hems */}
      <Folds c={c} d={[
        `M ${g.cx - g.thighHW * 0.5} ${g.kneeY - 16} q 8 6 16 2`,
        `M ${g.cx + g.thighHW * 0.5} ${g.kneeY - 16} q -8 6 -16 2`,
        `M ${g.cx - g.thighHW * 0.4} ${g.kneeY + 18} q 7 5 14 1`,
        `M ${g.cx + g.thighHW * 0.4} ${g.kneeY + 18} q -7 5 -14 1`,
      ]} w={2} o={0.35} />
      {[-1, 1].map((s) => (
        <path key={s} d={`M ${g.cx + s * (g.ankleHW + 4)} ${hemY - 8} Q ${g.cx + s * 2} ${hemY - 4} ${g.cx + s * (g.ankleHW - 1)} ${hemY - 8}`} stroke={c.darker} strokeWidth={2} fill="none" opacity={0.6} />
      ))}
    </g>
  );
}

function Chinos({ c }: { c: Ctx }) {
  const { g } = c;
  const topY = g.waistY - 8;
  const hemY = g.ankleY - 4;
  return (
    <g>
      <FabricDefs c={c} />
      <PantLeg c={c} side={-1} topY={topY} hemY={hemY} ease={6} />
      <PantLeg c={c} side={1} topY={topY} hemY={hemY} ease={6} />
      <Waistband c={c} topY={topY} />
      <circle cx={g.cx} cy={topY + 6} r={2.4} fill={c.light} stroke={c.darker} strokeWidth={0.9} />
      {/* front crease */}
      {[-1, 1].map((s) => (
        <path key={s} d={`M ${g.cx + s * g.thighHW * 0.45} ${topY + 30} L ${g.cx + s * g.ankleHW * 0.5} ${hemY - 12}`} stroke={c.darker} strokeWidth={1.4} opacity={0.4} />
      ))}
      <Folds c={c} d={[`M ${g.cx - 12} ${g.kneeY - 10} q 6 8 12 3`, `M ${g.cx + 12} ${g.kneeY - 10} q -6 8 -12 3`]} w={2} o={0.3} />
    </g>
  );
}

function Shorts({ c }: { c: Ctx }) {
  const { g } = c;
  const topY = g.waistY - 8;
  const hemY = g.crotchY + 56;
  return (
    <g>
      <FabricDefs c={c} />
      <PantLeg c={c} side={-1} topY={topY} hemY={hemY} ease={8} />
      <PantLeg c={c} side={1} topY={topY} hemY={hemY} ease={8} />
      <Waistband c={c} topY={topY} h={10} />
      {/* drawstring */}
      <path d={`M ${g.cx - 5} ${topY + 10} q -3 8 -1 14 M ${g.cx + 5} ${topY + 10} q 3 8 1 14`} stroke={c.light} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {[-1, 1].map((s) => (
        <path key={s} d={`M ${g.cx + s * (g.thighHW + 6)} ${hemY - 6} Q ${g.cx + s * 4} ${hemY} ${g.cx + s * 3} ${hemY - 6}`} stroke={c.darker} strokeWidth={2.2} fill="none" opacity={0.6} />
      ))}
    </g>
  );
}

function Skirt({ c }: { c: Ctx }) {
  const { g } = c;
  const topY = g.waistY - 6;
  const hemY = g.kneeY + 6;
  const wTop = g.waistHW + 5;
  const wHem = g.hipHW + 16;
  const d = smoothPath(
    [
      [g.cx - wTop, topY],
      [g.cx - wHem, hemY],
      [g.cx - wHem + 6, hemY + 4],
      [g.cx, hemY + 7],
      [g.cx + wHem - 6, hemY + 4],
      [g.cx + wHem, hemY],
      [g.cx + wTop, topY],
    ],
    true,
  );
  return (
    <g>
      <FabricDefs c={c} />
      <path d={d} fill={c.fill} />
      <path d={d} fill={c.fab} />
      <Waistband c={c} topY={topY} h={10} />
      {/* pleat folds */}
      <Folds c={c} d={[
        `M ${g.cx - wHem * 0.55} ${topY + 26} q -4 30 -8 62`,
        `M ${g.cx - wHem * 0.2} ${topY + 26} q -2 32 -4 66`,
        `M ${g.cx + wHem * 0.2} ${topY + 26} q 2 32 4 66`,
        `M ${g.cx + wHem * 0.55} ${topY + 26} q 4 30 8 62`,
      ]} />
      <path d={`M ${g.cx - wHem + 4} ${hemY - 2} Q ${g.cx} ${hemY + 5} ${g.cx + wHem - 4} ${hemY - 2}`} stroke={c.darker} strokeWidth={2.4} fill="none" opacity={0.6} />
    </g>
  );
}

function Leggings({ c }: { c: Ctx }) {
  const { g } = c;
  const topY = g.waistY - 8;
  const hemY = g.ankleY - 2;
  return (
    <g>
      <FabricDefs c={c} />
      <PantLeg c={c} side={-1} topY={topY} hemY={hemY} ease={1.5} />
      <PantLeg c={c} side={1} topY={topY} hemY={hemY} ease={1.5} />
      <Waistband c={c} topY={topY} h={14} />
      {/* ankle cuffs */}
      {[-1, 1].map((s) => (
        <path key={s} d={`M ${g.cx + s * (g.ankleHW + 2.5)} ${hemY - 10} Q ${g.cx + s} ${hemY - 6} ${g.cx + s * (g.ankleHW - 1)} ${hemY - 10}`} stroke={c.darker} strokeWidth={2.4} fill="none" opacity={0.7} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Dresses
// ---------------------------------------------------------------------------

function DressBase({ c, hemY, flare = 16 }: { c: Ctx; hemY: number; flare?: number }) {
  const { g } = c;
  const y = g.neckBotY + 4;
  const wTop = g.waistHW + 4;
  const wHem = g.hipHW + flare;
  // bodice
  const bodice = smoothPath(
    [
      [g.cx - g.neckHW - 8, y - 4],
      [g.cx - torsoHW(g, g.chestY, 3), g.chestY],
      [g.cx - wTop, g.waistY],
      [g.cx + wTop, g.waistY],
      [g.cx + torsoHW(g, g.chestY, 3), g.chestY],
      [g.cx + g.neckHW + 8, y - 4],
    ],
    true,
  );
  // skirt
  const skirt = smoothPath(
    [
      [g.cx - wTop, g.waistY],
      [g.cx - wHem, hemY],
      [g.cx - wHem + 8, hemY + 5],
      [g.cx, hemY + 8],
      [g.cx + wHem - 8, hemY + 5],
      [g.cx + wHem, hemY],
      [g.cx + wTop, g.waistY],
    ],
    true,
  );
  return (
    <g>
      <path d={bodice} fill={c.fill} />
      <path d={bodice} fill={c.fab} />
      <path d={skirt} fill={c.fill} />
      <path d={skirt} fill={c.fab} />
      {/* scoop neckline */}
      <path d={`M ${g.cx - g.neckHW - 8} ${y - 4} Q ${g.cx} ${y + 26} ${g.cx + g.neckHW + 8} ${y - 4} L ${g.cx + g.neckHW + 4} ${y + 2} Q ${g.cx} ${y + 30} ${g.cx - g.neckHW - 4} ${y + 2} Z`} fill={c.dark} opacity={0.85} />
      {/* waist seam */}
      <path d={`M ${g.cx - wTop} ${g.waistY} Q ${g.cx} ${g.waistY + 6} ${g.cx + wTop} ${g.waistY}`} stroke={c.darker} strokeWidth={2.2} fill="none" opacity={0.6} />
      {/* bust shaping */}
      <path d={`M ${g.cx - g.bustHW * 0.5} ${g.bustY + 10} q -3 8 -2 16 M ${g.cx + g.bustHW * 0.5} ${g.bustY + 10} q 3 8 2 16`} stroke={c.darker} strokeWidth={1.5} fill="none" opacity={0.5} />
      {/* skirt folds + hem */}
      <Folds c={c} d={[
        `M ${g.cx - wHem * 0.5} ${g.waistY + 30} q -5 34 -9 ${Math.min(70, hemY - g.waistY - 40)}`,
        `M ${g.cx - wHem * 0.18} ${g.waistY + 30} q -2 36 -4 ${Math.min(76, hemY - g.waistY - 36)}`,
        `M ${g.cx + wHem * 0.18} ${g.waistY + 30} q 2 36 4 ${Math.min(76, hemY - g.waistY - 36)}`,
        `M ${g.cx + wHem * 0.5} ${g.waistY + 30} q 5 34 9 ${Math.min(70, hemY - g.waistY - 40)}`,
      ]} />
      <path d={`M ${g.cx - wHem + 6} ${hemY - 1} Q ${g.cx} ${hemY + 6} ${g.cx + wHem - 6} ${hemY - 1}`} stroke={c.darker} strokeWidth={2.4} fill="none" opacity={0.6} />
    </g>
  );
}

function DressCasual({ c }: { c: Ctx }) {
  return (
    <g>
      <FabricDefs c={c} />
      <DressBase c={c} hemY={c.g.kneeY + 4} flare={15} />
    </g>
  );
}

function DressMaxi({ c }: { c: Ctx }) {
  return (
    <g>
      <FabricDefs c={c} />
      <DressBase c={c} hemY={c.g.ankleY - 14} flare={20} />
    </g>
  );
}

function DressSaree({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 4;
  const hemY = g.ankleY - 10;
  const wTop = g.waistHW + 4;
  const wHem = g.hipHW + 12;
  const skirt = smoothPath(
    [
      [g.cx - wTop, g.waistY - 4],
      [g.cx - wHem, hemY],
      [g.cx - wHem + 8, hemY + 5],
      [g.cx, hemY + 8],
      [g.cx + wHem - 8, hemY + 5],
      [g.cx + wHem, hemY],
      [g.cx + wTop, g.waistY - 4],
    ],
    true,
  );
  return (
    <g>
      <FabricDefs c={c} />
      {/* blouse */}
      <path d={smoothPath([[g.cx - g.neckHW - 8, y - 4], [g.cx - torsoHW(g, g.chestY, 3), g.chestY], [g.cx - wTop, g.waistY - 6], [g.cx + wTop, g.waistY - 6], [g.cx + torsoHW(g, g.chestY, 3), g.chestY], [g.cx + g.neckHW + 8, y - 4]], true)} fill={c.fill} />
      <path d={`M ${g.cx - g.neckHW - 8} ${y - 4} Q ${g.cx} ${y + 24} ${g.cx + g.neckHW + 8} ${y - 4} L ${g.cx + g.neckHW + 4} ${y + 2} Q ${g.cx} ${y + 28} ${g.cx - g.neckHW - 4} ${y + 2} Z`} fill={c.dark} opacity={0.85} />
      {/* wrapped skirt */}
      <path d={skirt} fill={c.fill} />
      <path d={skirt} fill={c.fab} />
      {/* wrap pleats fanning from waist */}
      <Folds c={c} d={[
        `M ${g.cx - 6} ${g.waistY + 6} Q ${g.cx - 26} ${g.waistY + 80} ${g.cx - 34} ${hemY - 30}`,
        `M ${g.cx + 2} ${g.waistY + 6} Q ${g.cx - 6} ${g.waistY + 90} ${g.cx - 12} ${hemY - 26}`,
        `M ${g.cx + 10} ${g.waistY + 6} Q ${g.cx + 14} ${g.waistY + 90} ${g.cx + 12} ${hemY - 26}`,
        `M ${g.cx - wHem * 0.6} ${g.waistY + 40} q -6 40 -10 80`,
        `M ${g.cx + wHem * 0.6} ${g.waistY + 40} q 6 40 10 80`,
      ]} />
      {/* pallu: drape over the left shoulder */}
      <path
        d={`M ${g.cx - g.shoulderHW + 6} ${g.shoulderY - 2} Q ${g.cx - g.shoulderHW - 4} ${g.chestY + 40} ${g.cx - g.waistHW - 12} ${g.waistY + 60} L ${g.cx - g.waistHW + 2} ${g.waistY + 66} Q ${g.cx - g.shoulderHW + 8} ${g.chestY + 40} ${g.cx - g.shoulderHW + 16} ${g.shoulderY + 2} Z`}
        fill={c.dark}
        opacity={0.92}
      />
      <path d={`M ${g.cx - g.waistHW - 12} ${g.waistY + 60} L ${g.cx - g.waistHW + 2} ${g.waistY + 66}`} stroke={c.light} strokeWidth={2} opacity={0.8} />
      {/* border */}
      <path d={`M ${g.cx - wHem + 8} ${hemY - 4} Q ${g.cx} ${hemY + 3} ${g.cx + wHem - 8} ${hemY - 4}`} stroke={c.light} strokeWidth={5} fill="none" opacity={0.85} />
      <path d={`M ${g.cx - wHem + 8} ${hemY - 4} Q ${g.cx} ${hemY + 3} ${g.cx + wHem - 8} ${hemY - 4}`} stroke={c.darker} strokeWidth={1.4} fill="none" opacity={0.6} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Outerwear
// ---------------------------------------------------------------------------

function Blazer({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 2;
  const hemY = g.hipY + 14;
  const e = 8;
  // left panel
  const panelL = smoothPath(
    [
      [g.cx - g.neckHW - 10, y - 6],
      [g.cx - torsoHW(g, g.chestY, e), g.chestY],
      [g.cx - torsoHW(g, g.waistY, e), g.waistY],
      [g.cx - torsoHW(g, hemY, e - 1), hemY],
      [g.cx - 10, hemY + 3],
      [g.cx - 7, g.waistY + 10],
      [g.cx - 11, g.chestY + 10],
      [g.cx - g.neckHW - 2, y + 16],
    ],
    true,
  );
  const panelR = smoothPath(
    [
      [g.cx + g.neckHW + 10, y - 6],
      [g.cx + torsoHW(g, g.chestY, e), g.chestY],
      [g.cx + torsoHW(g, g.waistY, e), g.waistY],
      [g.cx + torsoHW(g, hemY, e - 1), hemY],
      [g.cx + 10, hemY + 3],
      [g.cx + 7, g.waistY + 10],
      [g.cx + 11, g.chestY + 10],
      [g.cx + g.neckHW + 2, y + 16],
    ],
    true,
  );
  return (
    <g>
      <FabricDefs c={c} />
      <LongSleeve c={c} side={-1} />
      <LongSleeve c={c} side={1} />
      {/* structured shoulder pads */}
      <ellipse cx={g.cx - g.shoulderHW + 4} cy={g.shoulderY + 2} rx={14} ry={7} fill={c.light} opacity={0.35} />
      <ellipse cx={g.cx + g.shoulderHW - 4} cy={g.shoulderY + 2} rx={14} ry={7} fill={c.light} opacity={0.35} />
      <path d={panelL} fill={c.fill} />
      <path d={panelL} fill={c.fab} />
      <path d={panelR} fill={c.fill} />
      <path d={panelR} fill={c.fab} />
      {/* lapels */}
      <path d={`M ${g.cx - g.neckHW - 8} ${y - 6} L ${g.cx - 20} ${g.chestY + 2} L ${g.cx - 9} ${g.chestY + 14} L ${g.cx - g.neckHW - 2} ${y + 14} Z`} fill={c.dark} />
      <path d={`M ${g.cx + g.neckHW + 8} ${y - 6} L ${g.cx + 20} ${g.chestY + 2} L ${g.cx + 9} ${g.chestY + 14} L ${g.cx + g.neckHW + 2} ${y + 14} Z`} fill={c.dark} />
      <path d={`M ${g.cx - g.neckHW - 8} ${y - 6} L ${g.cx - 20} ${g.chestY + 2}`} stroke={c.light} strokeWidth={1.4} opacity={0.7} />
      <path d={`M ${g.cx + g.neckHW + 8} ${y - 6} L ${g.cx + 20} ${g.chestY + 2}`} stroke={c.light} strokeWidth={1.4} opacity={0.7} />
      {/* single button */}
      <circle cx={g.cx - 8} cy={g.waistY + 4} r={2.8} fill={c.darker} />
      <circle cx={g.cx + 8} cy={g.waistY + 4} r={2.8} fill="none" stroke={c.darker} strokeWidth={1.3} />
      <Folds c={c} d={[`M ${g.cx - torsoHW(g, g.waistY, e) + 10} ${g.waistY - 20} q -3 16 -1 34`, `M ${g.cx + torsoHW(g, g.waistY, e) - 10} ${g.waistY - 20} q 3 16 1 34`]} />
    </g>
  );
}

function Jacket({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      <FabricDefs c={c} />
      <LongSleeve c={c} side={-1} />
      <LongSleeve c={c} side={1} />
      <TopBody
        c={c}
        hemY={g.waistY + 34}
        ease={9}
        neckline={
          <g>
            {/* stand collar */}
            <path d={`M ${g.cx - g.neckHW - 9} ${g.neckBotY - 8} Q ${g.cx} ${g.neckBotY + 4} ${g.cx + g.neckHW + 9} ${g.neckBotY - 8} L ${g.cx + g.neckHW + 9} ${g.neckBotY} Q ${g.cx} ${g.neckBotY + 10} ${g.cx - g.neckHW - 9} ${g.neckBotY} Z`} fill={c.dark} />
            {/* zipper */}
            <rect x={g.cx - 2.5} y={g.neckBotY + 4} width={5} height={g.waistY + 26 - g.neckBotY} fill={c.darker} opacity={0.85} />
            <rect x={g.cx - 1} y={g.neckBotY + 10} width={2} height={10} fill={c.light} />
          </g>
        }
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Shoes
// ---------------------------------------------------------------------------

/** Foot anchor: shoe covers ankle → toe. */
function shoeBase(g: BodyGeom, side: -1 | 1) {
  const s = side;
  const ax = g.cx + s * 2;
  return {
    x0: ax - g.ankleHW - 7,
    x1: ax + s * 6 + 13,
    topY: g.ankleY - 8,
    botY: g.footY + 3,
  };
}

function Sneakers({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      <FabricDefs c={c} />
      {[-1, 1].map((s) => {
        const b = shoeBase(g, s as -1 | 1);
        return (
          <g key={s}>
            {/* sole */}
            <path d={`M ${b.x0} ${b.botY - 9} L ${b.x1} ${b.botY - 9} Q ${b.x1 + 3} ${b.botY - 4} ${b.x1 - 1} ${b.botY} L ${b.x0 + 2} ${b.botY} Q ${b.x0 - 3} ${b.botY - 4} ${b.x0} ${b.botY - 9} Z`} fill="#f2f0ec" stroke={c.darker} strokeWidth={1} />
            {/* upper */}
            <path d={`M ${b.x0 + 2} ${b.topY + 6} Q ${b.x0} ${b.botY - 10} ${b.x0 + 4} ${b.botY - 9} L ${b.x1 - 4} ${b.botY - 9} Q ${b.x1 + 2} ${b.topY + 12} ${b.x1 - 6} ${b.topY + 4} Q ${(b.x0 + b.x1) / 2} ${b.topY - 2} ${b.x0 + 2} ${b.topY + 6} Z`} fill={c.fill} />
            <path d={`M ${b.x0 + 2} ${b.topY + 6} Q ${b.x0} ${b.botY - 10} ${b.x0 + 4} ${b.botY - 9} L ${b.x1 - 4} ${b.botY - 9} Q ${b.x1 + 2} ${b.topY + 12} ${b.x1 - 6} ${b.topY + 4} Q ${(b.x0 + b.x1) / 2} ${b.topY - 2} ${b.x0 + 2} ${b.topY + 6} Z`} fill={c.fab} />
            {/* toe cap */}
            <path d={`M ${b.x1 - 12} ${b.botY - 9} Q ${b.x1 + 1} ${b.botY - 12} ${b.x1 - 2} ${b.topY + 10} Q ${b.x1 - 8} ${b.botY - 8} ${b.x1 - 12} ${b.botY - 9} Z`} fill={c.dark} opacity={0.5} />
            {/* laces */}
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M ${b.x0 + 10 + i * 2} ${b.topY + 8 + i * 5} q 8 -2 14 1`} stroke={c.darker} strokeWidth={1.6} fill="none" opacity={0.8} />
            ))}
            {/* ankle collar */}
            <path d={`M ${b.x0 + 2} ${b.topY + 6} Q ${(b.x0 + b.x1) / 2} ${b.topY - 2} ${b.x1 - 6} ${b.topY + 4}`} fill="none" stroke={c.darker} strokeWidth={2.4} opacity={0.7} />
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
      <FabricDefs c={c} />
      {[-1, 1].map((s) => {
        const b = shoeBase(g, s as -1 | 1);
        const midX = (b.x0 + b.x1) / 2;
        return (
          <g key={s}>
            {/* stiletto */}
            <path d={`M ${b.x0 + 5} ${b.botY - 7} L ${b.x0 + 7.5} ${b.botY + 11} L ${b.x0 + 10} ${b.botY + 11} L ${b.x0 + 9} ${b.botY - 7} Z`} fill={c.darker} />
            {/* vamp: slim pointed pump */}
            <path
              d={`M ${b.x0 + 3} ${b.topY + 12}
                  Q ${b.x0 + 1} ${b.botY - 10} ${midX + 2} ${b.botY - 7}
                  Q ${b.x1 + 1} ${b.botY - 5} ${b.x1 - 3} ${b.botY - 3}
                  L ${b.x0 + 8} ${b.botY - 3}
                  Q ${b.x0 + 4} ${b.topY + 4} ${b.x0 + 3} ${b.topY + 12} Z`}
              fill={c.fill}
            />
            {/* toe highlight */}
            <path d={`M ${midX - 2} ${b.botY - 8} Q ${b.x1 - 2} ${b.botY - 6} ${b.x1 - 5} ${b.botY - 4}`} stroke={c.light} strokeWidth={1.5} fill="none" opacity={0.65} strokeLinecap="round" />
            {/* ankle strap */}
            <path d={`M ${b.x0 + 1} ${b.topY + 9} Q ${midX} ${b.topY + 3} ${b.x1 - 5} ${b.topY + 9}`} fill="none" stroke={c.fill} strokeWidth={2.6} />
            <circle cx={midX} cy={b.topY + 6} r={1.4} fill={c.light} />
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
      <FabricDefs c={c} />
      {[-1, 1].map((s) => {
        const b = shoeBase(g, s as -1 | 1);
        return (
          <g key={s}>
            {/* sole */}
            <ellipse cx={(b.x0 + b.x1) / 2} cy={b.botY - 3} rx={(b.x1 - b.x0) / 2 + 1} ry={4.5} fill={shade(c.base, -30)} />
            {/* straps */}
            <path d={`M ${b.x0 + 4} ${b.botY - 6} Q ${(b.x0 + b.x1) / 2} ${b.topY + 2} ${b.x1 - 4} ${b.botY - 6}`} fill="none" stroke={c.fill} strokeWidth={4} strokeLinecap="round" />
            <path d={`M ${b.x0 + 6} ${b.botY - 8} Q ${(b.x0 + b.x1) / 2} ${b.topY + 8} ${b.x1 - 8} ${b.botY - 10}`} fill="none" stroke={c.dark} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
            <circle cx={(b.x0 + b.x1) / 2} cy={b.topY + 6} r={2} fill={c.light} stroke={c.darker} strokeWidth={0.8} />
          </g>
        );
      })}
    </g>
  );
}

function Boots({ c }: { c: Ctx }) {
  const { g } = c;
  return (
    <g>
      <FabricDefs c={c} />
      {[-1, 1].map((s) => {
        const b = shoeBase(g, s as -1 | 1);
        const shaftTop = g.calfY + 10;
        const w = g.ankleHW + 8;
        const ax = g.cx + s * 2;
        return (
          <g key={s}>
            {/* shaft */}
            <path d={`M ${ax - w} ${shaftTop} L ${ax + w} ${shaftTop} L ${ax + w - 1} ${b.topY + 8} L ${ax - w + 1} ${b.topY + 8} Z`} fill={c.fill} />
            <path d={`M ${ax - w} ${shaftTop} L ${ax + w} ${shaftTop} L ${ax + w - 1} ${b.topY + 8} L ${ax - w + 1} ${b.topY + 8} Z`} fill={c.fab} />
            {/* shaft top band */}
            <path d={`M ${ax - w} ${shaftTop} L ${ax + w} ${shaftTop} L ${ax + w} ${shaftTop + 7} L ${ax - w} ${shaftTop + 7} Z`} fill={c.dark} opacity={0.8} />
            {/* foot */}
            <path d={`M ${ax - w + 1} ${b.topY + 8} Q ${b.x0} ${b.botY - 8} ${b.x0 + 3} ${b.botY - 4} L ${b.x1 - 3} ${b.botY - 4} Q ${b.x1 + 2} ${b.topY + 10} ${ax + w - 1} ${b.topY + 8} Z`} fill={c.fill} />
            {/* sole + heel block */}
            <path d={`M ${b.x0} ${b.botY - 6} L ${b.x1} ${b.botY - 6} L ${b.x1 - 1} ${b.botY} L ${b.x0 + 1} ${b.botY} Z`} fill={shade(c.base, -38)} />
            <path d={`M ${b.x0 + 2} ${b.botY - 6} L ${b.x0 + 9} ${b.botY - 6} L ${b.x0 + 9} ${b.botY + 8} L ${b.x0 + 2} ${b.botY + 8} Z`} fill={shade(c.base, -42)} />
            {/* pull tab */}
            <path d={`M ${ax + w - 4} ${shaftTop} q 2 -8 6 -9`} stroke={c.dark} strokeWidth={2.4} fill="none" strokeLinecap="round" />
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
  const wx = wristX(g, 1);
  const wy = g.wristY - 2;
  const w = (g.wristHW + 2.5) * 0.7;
  const r = 5; // face radius (~30% smaller than before)
  return (
    <g>
      <FabricDefs c={c} />
      <path d={`M ${wx - w} ${wy - 8.4} L ${wx + w} ${wy - 8.4} L ${wx + w} ${wy + 8.4} L ${wx - w} ${wy + 8.4} Z`} fill={c.dark} />
      <circle cx={wx} cy={wy} r={r} fill={c.fill} stroke={c.darker} strokeWidth={1.4} />
      <circle cx={wx} cy={wy} r={r * 0.72} fill="#f5f2ec" />
      <path d={`M ${wx} ${wy} L ${wx} ${wy - r * 0.62} M ${wx} ${wy} L ${wx + r * 0.47} ${wy + r * 0.22}`} stroke="#222" strokeWidth={1.1} strokeLinecap="round" />
      <circle cx={wx} cy={wy} r={0.7} fill="#222" />
      {[0, 3, 6, 9].map((h) => {
        const a = (h / 12) * Math.PI * 2;
        return <circle key={h} cx={wx + Math.cos(a) * r * 0.72} cy={wy + Math.sin(a) * r * 0.72} r={0.45} fill="#222" />;
      })}
    </g>
  );
}

function Sunglasses({ c, config }: { c: Ctx; config: AvatarConfig }) {
  const f = faceLandmarks(c.g);
  const y = f.eyeY - 1;
  const w = 13;
  return (
    <g>
      <FabricDefs c={c} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect x={f.cx + s * f.ex - w / 2} y={y - 7} width={w} height={12} rx={5} fill={c.fill} opacity={0.94} />
          <rect x={f.cx + s * f.ex - w / 2} y={y - 7} width={w} height={12} rx={5} fill="none" stroke={c.darker} strokeWidth={1.4} />
          <path d={`M ${f.cx + s * f.ex - 4} ${y - 4} L ${f.cx + s * f.ex + 2} ${y + 3}`} stroke="#ffffff" strokeWidth={1.8} opacity={0.5} strokeLinecap="round" />
        </g>
      ))}
      <path d={`M ${f.cx - f.ex + w / 2 - 1} ${y - 2} Q ${f.cx} ${y - 5} ${f.cx + f.ex - w / 2 + 1} ${y - 2}`} stroke={c.darker} strokeWidth={1.8} fill="none" />
      <path d={`M ${f.cx - f.ex - w / 2} ${y - 1} L ${f.cx - f.ex - w / 2 - 8} ${y - 4} M ${f.cx + f.ex + w / 2} ${y - 1} L ${f.cx + f.ex + w / 2 + 8} ${y - 4}`} stroke={c.darker} strokeWidth={1.8} strokeLinecap="round" />
      {void config}
    </g>
  );
}

function Cap({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.headTopY + 2;
  const hw = g.headRx + 4;
  return (
    <g>
      <FabricDefs c={c} />
      {/* dome */}
      <path d={`M ${g.cx - hw} ${y + 16} Q ${g.cx - hw + 2} ${y - 12} ${g.cx} ${y - 14} Q ${g.cx + hw - 2} ${y - 12} ${g.cx + hw} ${y + 16} Q ${g.cx} ${y + 8} ${g.cx - hw} ${y + 16} Z`} fill={c.fill} />
      <path d={`M ${g.cx - hw} ${y + 16} Q ${g.cx - hw + 2} ${y - 12} ${g.cx} ${y - 14} Q ${g.cx + hw - 2} ${y - 12} ${g.cx + hw} ${y + 16} Q ${g.cx} ${y + 8} ${g.cx - hw} ${y + 16} Z`} fill={c.fab} />
      {/* panels */}
      <path d={`M ${g.cx} ${y - 14} L ${g.cx} ${y + 12} M ${g.cx - hw * 0.5} ${y - 8} Q ${g.cx - hw * 0.4} ${y + 4} ${g.cx - hw * 0.45} ${y + 13} M ${g.cx + hw * 0.5} ${y - 8} Q ${g.cx + hw * 0.4} ${y + 4} ${g.cx + hw * 0.45} ${y + 13}`} stroke={c.darker} strokeWidth={1.2} opacity={0.5} fill="none" />
      <circle cx={g.cx} cy={y - 14} r={2.6} fill={c.dark} />
      {/* brim */}
      <path d={`M ${g.cx - hw + 2} ${y + 14} Q ${g.cx} ${y + 6} ${g.cx + hw + 26} ${y + 12} Q ${g.cx + hw + 10} ${y + 20} ${g.cx + 4} ${y + 18} Q ${g.cx - hw / 2} ${y + 17} ${g.cx - hw + 2} ${y + 14} Z`} fill={c.dark} />
    </g>
  );
}

function Hat({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.headTopY + 4;
  return (
    <g>
      <FabricDefs c={c} />
      {/* brim */}
      <ellipse cx={g.cx} cy={y + 12} rx={g.headRx + 22} ry={9} fill={c.fill} />
      <ellipse cx={g.cx} cy={y + 12} rx={g.headRx + 22} ry={9} fill="none" stroke={c.darker} strokeWidth={1.2} opacity={0.6} />
      {/* crown */}
      <path d={`M ${g.cx - g.headRx + 4} ${y + 12} Q ${g.cx - g.headRx + 6} ${y - 22} ${g.cx} ${y - 24} Q ${g.cx + g.headRx - 6} ${y - 22} ${g.cx + g.headRx - 4} ${y + 12} Q ${g.cx} ${y + 16} ${g.cx - g.headRx + 4} ${y + 12} Z`} fill={c.fill} />
      {/* band */}
      <path d={`M ${g.cx - g.headRx + 4} ${y + 2} Q ${g.cx} ${y + 7} ${g.cx + g.headRx - 4} ${y + 2} L ${g.cx + g.headRx - 4} ${y + 9} Q ${g.cx} ${y + 14} ${g.cx - g.headRx + 4} ${y + 9} Z`} fill={c.dark} opacity={0.85} />
    </g>
  );
}

function Belt({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.waistY - 8;
  const w = g.waistHW + 7;
  return (
    <g>
      <FabricDefs c={c} />
      <path d={`M ${g.cx - w} ${y} L ${g.cx + w} ${y} L ${g.cx + w} ${y + 10} L ${g.cx - w} ${y + 10} Z`} fill={c.fill} />
      <rect x={g.cx - 8} y={y - 1.5} width={16} height={13} rx={2.5} fill="none" stroke={c.light} strokeWidth={2.6} />
      <circle cx={g.cx} cy={y + 5} r={1.6} fill={c.light} />
    </g>
  );
}

function Necklace({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 6;
  return (
    <g>
      <FabricDefs c={c} />
      <path d={`M ${g.cx - g.neckHW - 6} ${y - 6} Q ${g.cx} ${y + 34} ${g.cx + g.neckHW + 6} ${y - 6}`} fill="none" stroke={c.fill} strokeWidth={2.6} />
      <circle cx={g.cx} cy={y + 32} r={4.4} fill={c.fill} stroke={c.darker} strokeWidth={1} />
      <circle cx={g.cx - 1} cy={y + 30.5} r={1.2} fill="#ffffff" opacity={0.7} />
    </g>
  );
}

function Earrings({ c }: { c: Ctx }) {
  const f = faceLandmarks(c.g);
  return (
    <g>
      <FabricDefs c={c} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <circle cx={f.cx + s * (f.headRx - 1)} cy={f.earY + 8} r={1.6} fill={c.fill} />
          <path d={`M ${f.cx + s * (f.headRx - 1)} ${f.earY + 9.5} L ${f.cx + s * (f.headRx - 1)} ${f.earY + 15}`} stroke={c.fill} strokeWidth={1.6} />
          <circle cx={f.cx + s * (f.headRx - 1)} cy={f.earY + 17} r={3} fill={c.fill} stroke={c.darker} strokeWidth={0.8} />
          <circle cx={f.cx + s * (f.headRx - 1) - 1} cy={f.earY + 16} r={0.9} fill="#ffffff" opacity={0.7} />
        </g>
      ))}
    </g>
  );
}

function Scarf({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 2;
  return (
    <g>
      <FabricDefs c={c} />
      {/* wrap */}
      <path d={`M ${g.cx - g.neckHW - 12} ${y - 8} Q ${g.cx} ${y + 10} ${g.cx + g.neckHW + 12} ${y - 8} L ${g.cx + g.neckHW + 10} ${y + 4} Q ${g.cx} ${y + 20} ${g.cx - g.neckHW - 10} ${y + 4} Z`} fill={c.fill} />
      <path d={`M ${g.cx - g.neckHW - 12} ${y - 8} Q ${g.cx} ${y + 10} ${g.cx + g.neckHW + 12} ${y - 8} L ${g.cx + g.neckHW + 10} ${y + 4} Q ${g.cx} ${y + 20} ${g.cx - g.neckHW - 10} ${y + 4} Z`} fill={c.fab} />
      {/* hanging end */}
      <path d={`M ${g.cx + 8} ${y + 12} L ${g.cx + 26} ${y + 14} L ${g.cx + 20} ${y + 78} L ${g.cx + 4} ${y + 74} Z`} fill={c.fill} />
      <path d={`M ${g.cx + 8} ${y + 12} L ${g.cx + 26} ${y + 14} L ${g.cx + 20} ${y + 78} L ${g.cx + 4} ${y + 74} Z`} fill={c.fab} />
      <path d={`M ${g.cx + 12} ${y + 30} L ${g.cx + 18} ${y + 30} M ${g.cx + 10} ${y + 48} L ${g.cx + 18} ${y + 48}`} stroke={c.darker} strokeWidth={1.6} opacity={0.6} />
      {/* fringe */}
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M ${g.cx + 6 + i * 4.5} ${y + 74} l -1 7`} stroke={c.darker} strokeWidth={1.4} />
      ))}
    </g>
  );
}

function Tie({ c }: { c: Ctx }) {
  const { g } = c;
  const y = g.neckBotY + 6;
  return (
    <g>
      <FabricDefs c={c} />
      {/* knot */}
      <path d={`M ${g.cx - 7} ${y} L ${g.cx + 7} ${y} L ${g.cx + 4} ${y + 14} L ${g.cx - 4} ${y + 14} Z`} fill={c.dark} />
      {/* blade */}
      <path d={`M ${g.cx - 4} ${y + 14} L ${g.cx + 4} ${y + 14} L ${g.cx + 9} ${y + 92} L ${g.cx} ${y + 102} L ${g.cx - 9} ${y + 92} Z`} fill={c.fill} />
      <path d={`M ${g.cx - 4} ${y + 14} L ${g.cx + 4} ${y + 14} L ${g.cx + 9} ${y + 92} L ${g.cx} ${y + 102} L ${g.cx - 9} ${y + 92} Z`} fill={c.fab} />
      <path d={`M ${g.cx - 2} ${y + 20} L ${g.cx - 2} ${y + 80}`} stroke={c.light} strokeWidth={1.6} opacity={0.5} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const RENDERERS: Record<string, (c: Ctx, config: AvatarConfig) => React.ReactNode> = {
  tshirt: (c) => <Tshirt c={c} />,
  polo: (c) => <Polo c={c} />,
  shirt: (c) => <Shirt c={c} />,
  hoodie: (c) => <Hoodie c={c} />,
  kurta: (c) => <Kurta c={c} />,
  blouse: (c) => <Blouse c={c} />,
  tanktop: (c) => <Tanktop c={c} />,
  sweater: (c) => <Sweater c={c} />,
  jeans: (c) => <Jeans c={c} />,
  chinos: (c) => <Chinos c={c} />,
  shorts: (c) => <Shorts c={c} />,
  skirt: (c) => <Skirt c={c} />,
  leggings: (c) => <Leggings c={c} />,
  'dress-casual': (c) => <DressCasual c={c} />,
  'dress-maxi': (c) => <DressMaxi c={c} />,
  'dress-saree': (c) => <DressSaree c={c} />,
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
  const c = ctxFor(colorway, geom, uid, garmentId, config);
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
