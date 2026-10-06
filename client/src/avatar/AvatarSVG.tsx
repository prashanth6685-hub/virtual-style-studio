import { useId, useMemo } from 'react';
import type { AvatarConfig, AvatarPose } from './types';
import type { Colorway, GarmentRef } from '@vss/shared';
import { SKIN_TONES } from './types';
import type { BodyGeom } from './body';
import { computeGeometry, bodySilhouettePath, armPath } from './body';
import Face from './face';
import { HairBack, HairTop } from './hair';
import { renderGarment, garmentLayer } from './garments';
import { toRenderId } from '../lib/catalog';
import { patternDefsFor } from '../lib/color';
import { shade } from '../lib/color';

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
  const skinShadow = shade(skin, -12);

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

        {/* body skin */}
        <path d={bodySilhouettePath(g)} fill={skin} />
        <path d={armPath(g, -1)} fill={skin} />
        <path d={armPath(g, 1)} fill={skin} />
        {/* hands */}
        <circle cx={g.cx - (g.shoulderHW - 9)} cy={g.wristY + 8} r={g.handR} fill={skin} />
        <circle cx={g.cx + (g.shoulderHW - 9)} cy={g.wristY + 8} r={g.handR} fill={skin} />
        {/* neck */}
        <path
          d={`M ${g.cx - g.neckHW} ${g.neckTopY} L ${g.cx + g.neckHW} ${g.neckTopY} L ${g.cx + g.neckHW + 4} ${g.neckBotY} L ${g.cx - g.neckHW - 4} ${g.neckBotY} Z`}
          fill={skin}
        />
        <path
          d={`M ${g.cx - g.neckHW} ${g.neckTopY + 10} Q ${g.cx} ${g.neckTopY + 18} ${g.cx + g.neckHW} ${g.neckTopY + 10} L ${g.cx + g.neckHW} ${g.neckTopY + 22} Q ${g.cx} ${g.neckTopY + 30} ${g.cx - g.neckHW} ${g.neckTopY + 22} Z`}
          fill={skinShadow}
          opacity={0.55}
        />

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
