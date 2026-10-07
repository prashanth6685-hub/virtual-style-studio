import { useId, useMemo } from 'react';
import type { AvatarConfig, AvatarPose } from './types';
import type { Colorway, GarmentRef } from '@vss/shared';
import { SKIN_TONES } from './types';
import type { BodyGeom } from './body';
import {
  computeGeometry,
  torsoPath,
  legPath,
  footPath,
  armPath,
  armJoints,
  wristX,
  handPath,
} from './body';
import Face, { lipColorFor } from './face';
import { EYE_COLOR_HEX } from './types';
import type { EyeColor } from './types';
import { HairBack, HairTop } from './hair';
import { renderGarment, garmentLayer } from './garments';
import { toRenderId } from '../lib/catalog';
import { patternDefsFor } from '../lib/color';
import { shade } from '../lib/color';
import { skinCylId, faceId, hairId, lipId, irisId, SOFT, SOFT6 } from './ids';

export interface AvatarSVGProps {
  config: AvatarConfig;
  /** outfit items (catalog garment ids) to render onto the avatar */
  outfit?: GarmentRef[];
  pose?: AvatarPose;
  className?: string;
  title?: string;
  /** aspect handled by parent; svg fills width */
  width?: number | string;
  height?: number | string;
}

function poseTransform(pose: AvatarPose, cx: number): string | undefined {
  if (pose === 'three-quarter') return `translate(${cx} 0) scale(0.92 1) translate(${-cx} 0)`;
  if (pose === 'side') return `translate(${cx} 0) scale(0.74 1) translate(${-cx} 0)`;
  return undefined;
}

/**
 * Layered parametric avatar. Identity (face/skin/hair/body) is derived ONLY from
 * `config`; `outfit` only adds clothing layers — changing clothes never changes
 * who the avatar is.
 *
 * Identity shading uses config-derived gradient/filter IDs (see ./ids.ts), so
 * every `url(#…)` reference is deterministic per config and the
 * identity-stability test (which strips <defs>) stays green.
 */
export default function AvatarSVG({
  config,
  outfit = [],
  pose = 'front',
  className,
  title = 'Virtual avatar',
  width = '100%',
  height,
}: AvatarSVGProps) {
  const rawId = useId();
  const uid = useMemo(() => rawId.replace(/[^a-zA-Z0-9]/g, ''), [rawId]);
  const geom: BodyGeom = useMemo(() => computeGeometry(config), [config]);
  const skin = SKIN_TONES[(config.skinTone ?? 6) - 1] ?? SKIN_TONES[5];
  const skinDeep = shade(skin, -24);
  const hairColor = config.hair.color;
  const lipColor = lipColorFor(config);
  const irisColor: string = EYE_COLOR_HEX[config.face.eyeColor as EyeColor] ?? EYE_COLOR_HEX.brown;

  const colorways: Colorway[] = useMemo(
    () => outfit.map((o) => o.colorway),
    [outfit],
  );
  const patterns = useMemo(() => patternDefsFor(colorways, uid), [colorways, uid]);

  const layers = useMemo(() => {
    const byLayer: Record<'body' | 'neck' | 'head' | 'wrist', GarmentRef[]> = {
      body: [],
      neck: [],
      head: [],
      wrist: [],
    };
    for (const item of outfit) byLayer[garmentLayer(toRenderId(item.garmentId))].push(item);
    // body layer order: shoes → bottoms/dresses → tops → outerwear → belt
    const rank = (id: string) => {
      if (['sneakers', 'heels', 'sandals', 'boots'].includes(id)) return 0;
      if (['jeans', 'chinos', 'shorts', 'skirt', 'leggings', 'dress-casual', 'dress-maxi', 'dress-saree'].includes(id)) return 1;
      if (['tshirt', 'polo', 'shirt', 'hoodie', 'kurta', 'blouse', 'tanktop', 'sweater'].includes(id)) return 2;
      if (['blazer', 'jacket'].includes(id)) return 3;
      return 4; // belt and the rest on top
    };
    byLayer.body.sort((a, b) => rank(a.garmentId) - rank(b.garmentId));
    return byLayer;
  }, [outfit]);

  const g = geom;
  const transform = poseTransform(pose, g.cx);
  const cyl = `url(#${skinCylId(skin)})`;

  const renderLayer = (items: GarmentRef[]) =>
    items.map((item) =>
      renderGarment({ garmentId: toRenderId(item.garmentId), colorway: item.colorway, geom: g, config, uid }),
    );

  return (
    <svg
      viewBox="0 0 320 640"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        {/* identity form gradients — config-derived IDs, deterministic per avatar.
            The skin cylinder uses userSpaceOnUse so limbs, torso, neck and ears
            share ONE consistent shading field (objectBoundingBox would give each
            path its own compressed gradient and draw a visible seam where the
            arm tucks under the torso). cx is always 160; ±72 covers every build. */}
        <linearGradient id={skinCylId(skin)} gradientUnits="userSpaceOnUse" x1={g.cx - 72} y1="0" x2={g.cx + 72} y2="0">
          <stop offset="0" stopColor={shade(skin, -22)} />
          <stop offset="0.28" stopColor={skin} />
          <stop offset="0.5" stopColor={shade(skin, 10)} />
          <stop offset="0.72" stopColor={skin} />
          <stop offset="1" stopColor={shade(skin, -22)} />
        </linearGradient>
        <radialGradient id={faceId(skin)} cx="0.5" cy="0.36" r="0.78">
          <stop offset="0" stopColor={shade(skin, 12)} />
          <stop offset="0.55" stopColor={skin} />
          <stop offset="1" stopColor={shade(skin, -12)} />
        </radialGradient>
        <linearGradient id={hairId(hairColor)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(hairColor, -22)} />
          <stop offset="0.45" stopColor={hairColor} />
          <stop offset="1" stopColor={shade(hairColor, 10)} />
        </linearGradient>
        <linearGradient id={lipId(lipColor)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(lipColor, -28)} />
          <stop offset="0.55" stopColor={lipColor} />
          <stop offset="1" stopColor={shade(lipColor, 12)} />
        </linearGradient>
        <radialGradient id={irisId(irisColor)} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor={shade(irisColor, -35)} />
          <stop offset="0.45" stopColor={irisColor} />
          <stop offset="1" stopColor={shade(irisColor, -55)} />
        </radialGradient>
        <radialGradient id="vss-ew" cx="0.5" cy="0.5" r="0.65">
          <stop offset="0.6" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ddd6cd" />
        </radialGradient>
        <radialGradient id="vss-blush" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e0707f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e0707f" stopOpacity="0" />
        </radialGradient>
        <filter id={SOFT} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id={SOFT6} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {patterns.map((p) => (
          <pattern key={p.id} id={p.id} width={p.kind === 'plaid' ? 24 : 16} height={p.kind === 'plaid' ? 24 : 16} patternUnits="userSpaceOnUse">
            <rect width="100%" height="100%" fill={p.base} />
            {p.kind === 'stripes' && (
              <g>
                <rect x={0} y={0} width={16} height={5} fill={p.accent} opacity={0.85} />
                <rect x={0} y={8} width={16} height={2} fill={p.accent} opacity={0.5} />
              </g>
            )}
            {p.kind === 'dots' && (
              <g fill={p.accent} opacity={0.85}>
                <circle cx={4} cy={4} r={2.2} />
                <circle cx={12} cy={12} r={2.2} />
              </g>
            )}
            {p.kind === 'plaid' && (
              <g opacity={0.7}>
                <rect x={0} y={0} width={24} height={7} fill={p.accent} opacity={0.55} />
                <rect x={0} y={0} width={7} height={24} fill={p.accent} opacity={0.55} />
                <rect x={10} y={0} width={3} height={24} fill={p.accent} opacity={0.9} />
                <rect x={0} y={10} width={24} height={3} fill={p.accent} opacity={0.9} />
              </g>
            )}
          </pattern>
        ))}
      </defs>

      <g transform={transform}>
        {/* back hair */}
        <HairBack config={config} geom={g} pose={pose} />

        {/* legs with cylindrical form */}
        <path d={legPath(g, -1)} fill={cyl} />
        <path d={legPath(g, 1)} fill={cyl} />
        {/* knee modeling */}
        {/* inner-thigh shadow */}
        <path d={`M ${g.cx - 8} ${g.crotchY + 18} Q ${g.cx - 6} ${g.crotchY + 60} ${g.cx - 9} ${g.kneeY - 40}`} stroke={skinDeep} strokeWidth={4} fill="none" opacity={0.16} filter={`url(#${SOFT})`} strokeLinecap="round" />
        <path d={`M ${g.cx + 8} ${g.crotchY + 18} Q ${g.cx + 6} ${g.crotchY + 60} ${g.cx + 9} ${g.kneeY - 40}`} stroke={skinDeep} strokeWidth={4} fill="none" opacity={0.16} filter={`url(#${SOFT})`} strokeLinecap="round" />
        {/* feet */}
        <path d={footPath(g, -1)} fill={cyl} />
        <path d={footPath(g, 1)} fill={cyl} />

        {/* arms + hands */}
        <path d={armPath(g, -1)} fill={cyl} />
        <path d={armPath(g, 1)} fill={cyl} />
        {/* bicep / forearm modeling follows the arm centerline */}
        {([-1, 1] as const).map((s) => {
          const j = armJoints(g, s);
          const midUx = (j.j0x + j.j1x) / 2;
          const midUy = (j.j0y + j.j1y) / 2;
          const midFx = (j.j1x + j.j2x) / 2;
          const midFy = (j.j1y + j.j2y) / 2;
          return (
            <g key={s}>
              <ellipse cx={midUx} cy={midUy} rx={4.5} ry={15} fill="#ffffff" opacity={0.1} filter={`url(#${SOFT})`} />
              <path d={`M ${midFx + s * 2} ${midFy - 18} Q ${midFx + s * 3} ${midFy} ${midFx + s * 1} ${midFy + 18}`} stroke={skinDeep} strokeWidth={3} fill="none" opacity={0.22} filter={`url(#${SOFT})`} strokeLinecap="round" />
            </g>
          );
        })}
        <path d={handPath(g, -1)} fill={cyl} />
        <path d={handPath(g, 1)} fill={cyl} />
        {/* finger separations + thumb crease */}
        {([-1, 1] as const).map((s) => {
          const wx = wristX(g, s);
          const wy = g.wristY - 2;
          const L = g.handLen;
          return (
            <g key={s} stroke={skinDeep} strokeWidth={1.1} opacity={0.45} strokeLinecap="round" fill="none">
              <path d={`M ${wx + s * 4} ${wy + L * 0.82} q 0 ${L * 0.05} ${-s * 0.6} ${L * 0.09}`} />
              <path d={`M ${wx + s * 0} ${wy + L * 0.86} q 0 ${L * 0.05} ${-s * 0.6} ${L * 0.09}`} />
              <path d={`M ${wx - s * 4} ${wy + L * 0.82} q 0 ${L * 0.05} ${-s * 0.6} ${L * 0.08}`} />
              <path d={`M ${wx - s * 8.5} ${wy + L * 0.44} q ${s * 2.5} ${L * 0.04} ${s * 4} ${-L * 0.03}`} />
            </g>
          );
        })}

        {/* torso with form */}
        <path d={torsoPath(g)} fill={cyl} />
        {/* torso side shading */}
        <path d={`M ${g.cx - g.waistHW + 2} ${g.waistY - 40} Q ${g.cx - g.waistHW - 2} ${g.waistY} ${g.cx - g.waistHW + 3} ${g.waistY + 44}`} stroke={skinDeep} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.28} filter={`url(#${SOFT})`} />
        <path d={`M ${g.cx + g.waistHW - 2} ${g.waistY - 40} Q ${g.cx + g.waistHW + 2} ${g.waistY} ${g.cx + g.waistHW - 3} ${g.waistY + 44}`} stroke={skinDeep} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.28} filter={`url(#${SOFT})`} />
        {/* chest center light */}
        <ellipse cx={g.cx} cy={(g.chestY + g.waistY) / 2} rx={g.chestHW * 0.4} ry={34} fill="#ffffff" opacity={0.1} filter={`url(#${SOFT6})`} />
        {g.isFeminine ? (
          <g>
            {/* bust form */}
            <ellipse cx={g.cx - g.bustHW * 0.52} cy={g.bustY + 16} rx={g.bustHW * 0.34} ry={13} fill={skinDeep} opacity={0.22} filter={`url(#${SOFT})`} />
            <ellipse cx={g.cx + g.bustHW * 0.52} cy={g.bustY + 16} rx={g.bustHW * 0.34} ry={13} fill={skinDeep} opacity={0.3} filter={`url(#${SOFT})`} />
            <ellipse cx={g.cx - g.bustHW * 0.52} cy={g.bustY + 2} rx={g.bustHW * 0.3} ry={10} fill="#ffffff" opacity={0.10} filter={`url(#${SOFT})`} />
            <ellipse cx={g.cx + g.bustHW * 0.52} cy={g.bustY + 2} rx={g.bustHW * 0.3} ry={10} fill="#ffffff" opacity={0.10} filter={`url(#${SOFT})`} />
            <path d={`M ${g.cx} ${g.bustY - 6} L ${g.cx} ${g.bustY + 22}`} stroke={skinDeep} strokeWidth={3} opacity={0.3} filter={`url(#${SOFT})`} strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* navel + faint linea alba (pectoral curve shading removed) */}
            <path d={`M ${g.cx} ${g.waistY - 26} L ${g.cx} ${g.waistY + 30}`} stroke={skinDeep} strokeWidth={2} opacity={0.22} filter={`url(#${SOFT})`} strokeLinecap="round" />
          </g>
        )}
        {/* navel */}
        <ellipse cx={g.cx} cy={g.waistY + 6} rx={1.8} ry={2.6} fill={skinDeep} opacity={0.28} filter={`url(#${SOFT})`} />

        {/* neck: flared trapezoid flowing into the trapezius (no notch) */}
        <path
          d={`M ${g.cx - g.neckHW} ${g.neckTopY} L ${g.cx + g.neckHW} ${g.neckTopY} C ${g.cx + g.neckHW + 3} ${g.neckTopY + 18}, ${g.cx + g.neckHW + 9} ${g.neckBotY - 6}, ${g.cx + g.neckHW + 13} ${g.neckBotY + 8} L ${g.cx - g.neckHW - 13} ${g.neckBotY + 8} C ${g.cx - g.neckHW - 9} ${g.neckBotY - 6}, ${g.cx - g.neckHW - 3} ${g.neckTopY + 18}, ${g.cx - g.neckHW} ${g.neckTopY} Z`}
          fill={cyl}
        />
        {/* trapezius shading follows the neck-to-shoulder slope */}
        <path d={`M ${g.cx - g.neckHW - 4} ${g.neckBotY} L ${g.cx - g.shoulderHW + 22} ${g.shoulderY - 3} M ${g.cx + g.neckHW + 4} ${g.neckBotY} L ${g.cx + g.shoulderHW - 22} ${g.shoulderY - 3}`} stroke={skinDeep} strokeWidth={4} opacity={0.22} filter={`url(#${SOFT})`} strokeLinecap="round" />

        {/* face (head + features) */}
        <Face config={config} geom={g} pose={pose} skin={skin} />

        {/* front hair */}
        <HairTop config={config} geom={g} pose={pose} />

        {/* clothing: body layer */}
        <g>{renderLayer(layers.body)}</g>
        {/* neck accessories */}
        <g>{renderLayer(layers.neck)}</g>
        {/* wrist accessories */}
        <g>{renderLayer(layers.wrist)}</g>
        {/* head accessories */}
        <g>{renderLayer(layers.head)}</g>
      </g>
    </svg>
  );
}

/** Convenience: the skin hex for a config (used by UI swatches etc.). */
export function skinHexFor(config: AvatarConfig): string {
  return SKIN_TONES[(config.skinTone ?? 6) - 1] ?? SKIN_TONES[5];
}
