import type { AvatarConfig, AvatarPose, EyeColor } from './types';
import { EYE_COLOR_HEX, SKIN_TONES } from './types';
import type { BodyGeom } from './body';
import { headPath } from './body';
import { shade } from '../lib/color';
import { skinCylId, faceId, lipId, irisId, SOFT, SOFT6 } from './ids';

interface FaceProps {
  config: AvatarConfig;
  geom: BodyGeom;
  pose: AvatarPose;
  skin: string;
}

function poseShift(pose: AvatarPose, headRx: number): number {
  if (pose === 'side') return -headRx * 0.42;
  if (pose === 'three-quarter') return -headRx * 0.16;
  return 0;
}

/** Semi-realistic eye: socket shadow, lid anatomy, gradient iris, lashes. */
function Eye({
  x,
  y,
  shape,
  iris,
  flip = false,
}: {
  x: number;
  y: number;
  shape: AvatarConfig['face']['eyeShape'];
  iris: string;
  flip?: boolean;
}) {
  const dims = {
    almond: { rx: 7.1, ry: 4.5 },
    round: { rx: 7.0, ry: 5.6 },
    hooded: { rx: 7.4, ry: 4.4 },
    monolid: { rx: 7.2, ry: 3.3 },
  }[shape];
  const s = flip ? -1 : 1;
  return (
    <g>
      {/* socket shadow (brow bone above) */}
      <ellipse cx={x} cy={y - 8.5} rx={dims.rx + 4} ry={5} fill="#2a1a10" opacity={0.16} filter={`url(#${SOFT6})`} />
      {/* eyeball */}
      <ellipse cx={x} cy={y} rx={dims.rx} ry={dims.ry} fill="url(#vss-ew)" />
      {/* iris with limbal ring */}
      <circle cx={x} cy={y + 0.6} r={3.9} fill={`url(#${irisId(iris)})`} />
      <circle cx={x} cy={y + 0.6} r={3.9} fill="none" stroke="#100c09" strokeWidth={1} opacity={0.75} />
      <circle cx={x} cy={y + 0.6} r={1.9} fill="#140f0c" />
      <circle cx={x - 1.4} cy={y - 0.7} r={1.1} fill="#ffffff" opacity={0.95} />
      <circle cx={x + 1.3} cy={y + 1.6} r={0.55} fill="#ffffff" opacity={0.65} />
      {/* upper lid: thick tapered band */}
      <path
        d={`M ${x - dims.rx * s - 1.6} ${y - 0.6}
            Q ${x - dims.rx * 0.45 * s} ${y - dims.ry - 2.6}, ${x} ${y - dims.ry - 2.0}
            Q ${x + dims.rx * 0.55 * s} ${y - dims.ry - 2.4}, ${x + dims.rx * s + 1.2} ${y - 1.4}
            L ${x + dims.rx * s + 0.4} ${y + 0.4}
            Q ${x} ${y - dims.ry - 0.8}, ${x - dims.rx * s - 0.6} ${y + 1.2} Z`}
        fill="#221a14"
      />
      {/* lash flick at outer corner */}
      <path
        d={`M ${x + dims.rx * s + 0.8} ${y - 1.2} q ${3.2 * s} ${-1.6} ${4.6 * s} ${-0.4}`}
        fill="none"
        stroke="#221a14"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      {/* lower lid */}
      <path
        d={`M ${x - dims.rx * 0.75 * s} ${y + dims.ry - 0.8} Q ${x} ${y + dims.ry + 1.4} ${x + dims.rx * 0.75 * s} ${y + dims.ry - 1}`}
        fill="none"
        stroke="#3a2c2288"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      {/* double-eyelid crease */}
      {shape !== 'monolid' && (
        <path
          d={`M ${x - dims.rx * 0.95 * s} ${y - dims.ry - 3.2} Q ${x} ${y - dims.ry - 6.4} ${x + dims.rx * 0.95 * s} ${y - dims.ry - 3.4}`}
          fill="none"
          stroke="#2a1f16"
          strokeWidth={1.3}
          opacity={0.55}
          strokeLinecap="round"
        />
      )}
      {shape === 'hooded' && (
        <path
          d={`M ${x - dims.rx * s} ${y - dims.ry - 4.4} Q ${x} ${y - dims.ry - 9.5} ${x + dims.rx * s} ${y - dims.ry - 4.6}`}
          fill="none"
          stroke="#221a14"
          strokeWidth={2}
          opacity={0.7}
          strokeLinecap="round"
        />
      )}
      {/* inner corner */}
      <circle cx={x - dims.rx * s * 0.92} cy={y + 0.6} r={1.1} fill="#d98a7a" opacity={0.7} />
    </g>
  );
}

/** Brow: sculpted filled shape with hair-stroke texture on top. */
function Brow({
  x,
  y,
  style,
}: {
  x: number;
  y: number;
  style: AvatarConfig['face']['brows'];
}) {
  const len = style === 'thin' ? 8.5 : 10;
  const th = { thin: 2.6, medium: 3.8, thick: 5.4, arched: 3.6, straight: 3.4 }[style];
  const archH = style === 'arched' ? -4.2 : style === 'straight' ? -0.8 : -2.4;
  // base shape: tapered, thicker at inner third, arched peak at ~60%
  const base =
    `M ${x - len} ${y + th * 0.35}` +
    ` Q ${x - len * 0.3} ${y + archH - th * 0.5}, ${x + len * 0.25} ${y + archH - th * 0.35}` +
    ` Q ${x + len * 0.75} ${y + archH * 0.5}, ${x + len} ${y + 0.6}` +
    ` Q ${x + len * 0.4} ${y + archH * 0.9 + th * 0.75}, ${x - len * 0.3} ${y + th * 0.75}` +
    ` Q ${x - len * 0.8} ${y + th * 0.6}, ${x - len} ${y + th * 0.35} Z`;
  const strokes = [];
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + (i / 5) * 0.76;
    const bx = x - len + t * len * 2;
    const by = y + archH * Math.sin(t * Math.PI) * 0.8;
    strokes.push(
      <path
        key={i}
        d={`M ${bx.toFixed(1)} ${by.toFixed(1)} q 1.8 -1.2 3.6 -1.5`}
        fill="none"
        stroke={shade('#241c14', 18)}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.7}
      />,
    );
  }
  return (
    <g>
      <path d={base} fill="#241c14" opacity={0.94} />
      {strokes}
    </g>
  );
}

/** Realistic nose: bridge highlight + shadow, defined tip, nostril openings. */
function Nose({
  x,
  y,
  shape,
  profile,
  skin,
}: {
  x: number;
  y: number;
  shape: AvatarConfig['face']['nose'];
  profile: boolean;
  skin: string;
}) {
  const shadow = shade(skin, -26);
  if (profile) {
    return (
      <g>
        <path d={`M ${x + 5} ${y - 10} Q ${x - 4} ${y} ${x - 7} ${y + 2}`} fill="none" stroke={shadow} strokeWidth={2.4} opacity={0.5} strokeLinecap="round" />
        <path d={`M ${x - 7} ${y + 2} Q ${x - 7.5} ${y + 6} ${x - 2} ${y + 6.8}`} fill="none" stroke="#2a1a10" strokeWidth={2.2} opacity={0.6} strokeLinecap="round" />
        <ellipse cx={x - 3.5} cy={y + 5} rx={2.6} ry={1.6} fill="#2a1a10" opacity={0.5} />
        <ellipse cx={x + 1} cy={y - 4} rx={1.6} ry={5} fill="#ffffff" opacity={0.3} filter={`url(#${SOFT})`} />
      </g>
    );
  }
  const wide = shape === 'wide' ? 1.3 : 1;
  const tipY = y + 3;
  return (
    <g>
      {/* bridge highlight */}
      <path d={`M ${x - 0.8} ${y - 11} L ${x - 1.6} ${tipY - 4}`} stroke="#ffffff" strokeWidth={3} opacity={0.32} strokeLinecap="round" filter={`url(#${SOFT})`} />
      {/* bridge side shadow */}
      <path d={`M ${x - 3.4} ${y - 10} Q ${x - 5.2} ${y - 2} ${x - 4.2} ${tipY - 4}`} fill="none" stroke={shadow} strokeWidth={2.2} opacity={0.45} strokeLinecap="round" filter={`url(#${SOFT})`} />
      {/* tip highlight */}
      <ellipse cx={x - 0.5} cy={tipY - 2.5} rx={3.4} ry={2.4} fill="#ffffff" opacity={0.3} filter={`url(#${SOFT})`} />
      {/* alae (wings) */}
      <path d={`M ${x - 6.4 * wide} ${tipY - 3} Q ${x - 7.4 * wide} ${tipY + 1.5} ${x - 3.4 * wide} ${tipY + 2.4}`} fill="none" stroke={shadow} strokeWidth={1.8} opacity={0.55} strokeLinecap="round" />
      <path d={`M ${x + 6.4 * wide} ${tipY - 3} Q ${x + 7.4 * wide} ${tipY + 1.5} ${x + 3.4 * wide} ${tipY + 2.4}`} fill="none" stroke={shadow} strokeWidth={1.8} opacity={0.55} strokeLinecap="round" />
      {/* nostril openings */}
      <ellipse cx={x - 3.6 * wide} cy={tipY + 1.6} rx={2.1} ry={1.3} fill="#241610" opacity={0.62} transform={`rotate(-18 ${x - 3.6 * wide} ${tipY + 1.6})`} />
      <ellipse cx={x + 3.6 * wide} cy={tipY + 1.6} rx={2.1} ry={1.3} fill="#241610" opacity={0.62} transform={`rotate(18 ${x + 3.6 * wide} ${tipY + 1.6})`} />
      {/* base shadow */}
      <path d={`M ${x - 5 * wide} ${tipY + 4.6} Q ${x} ${tipY + 7} ${x + 5 * wide} ${tipY + 4.6}`} fill="none" stroke={shadow} strokeWidth={2} opacity={0.35} strokeLinecap="round" filter={`url(#${SOFT})`} />
      {shape === 'pointed' && (
        <path d={`M ${x} ${tipY - 6} L ${x - 0.6} ${tipY}`} stroke={shadow} strokeWidth={1.6} opacity={0.4} strokeLinecap="round" />
      )}
    </g>
  );
}

/** Volumetric lips: cupid's bow, highlight on the lower lip, defined mouth line. */
function Lips({
  x,
  y,
  shape,
  color,
}: {
  x: number;
  y: number;
  shape: AvatarConfig['face']['lips'];
  color: string;
}) {
  const w = { full: 12.5, medium: 10.5, thin: 8.5 }[shape];
  const h = { full: 5.4, medium: 4.4, thin: 3.2 }[shape];
  const gid = lipId(color);
  return (
    <g>
      {/* under-lip shadow */}
      <ellipse cx={x} cy={y + h * 1.7} rx={w * 0.7} ry={2.4} fill="#2a1a10" opacity={0.22} filter={`url(#${SOFT})`} />
      {/* upper lip */}
      <path
        d={`M ${x - w} ${y}
            Q ${x - w * 0.58} ${y - h * 1.2}, ${x - w * 0.14} ${y - h * 0.5}
            Q ${x - w * 0.05} ${y - h * 0.95}, ${x} ${y - h * 0.72}
            Q ${x + w * 0.05} ${y - h * 0.95}, ${x + w * 0.14} ${y - h * 0.5}
            Q ${x + w * 0.58} ${y - h * 1.2}, ${x + w} ${y}
            Q ${x} ${y + h * 0.3}, ${x - w} ${y} Z`}
        fill={`url(#${gid})`}
      />
      {/* lower lip */}
      <path
        d={`M ${x - w * 0.96} ${y + 0.4} Q ${x} ${y + h * 1.75}, ${x + w * 0.96} ${y + 0.4} Q ${x} ${y + h * 0.42}, ${x - w * 0.96} ${y + 0.4} Z`}
        fill={`url(#${gid})`}
      />
      {/* lower-lip highlight (volume) */}
      <ellipse cx={x + w * 0.1} cy={y + h * 0.95} rx={w * 0.34} ry={h * 0.26} fill="#ffffff" opacity={0.38} filter={`url(#${SOFT})`} />
      {/* mouth line */}
      <path
        d={`M ${x - w} ${y} Q ${x} ${y + h * 0.4}, ${x + w} ${y}`}
        fill="none"
        stroke="#3d1712"
        strokeWidth={1.5}
        opacity={0.8}
        strokeLinecap="round"
      />
      {/* corner shadows */}
      <circle cx={x - w - 0.6} cy={y + 0.8} r={1.2} fill="#3d1712" opacity={0.45} filter={`url(#${SOFT})`} />
      <circle cx={x + w + 0.6} cy={y + 0.8} r={1.2} fill="#3d1712" opacity={0.45} filter={`url(#${SOFT})`} />
      {/* philtrum */}
      <path
        d={`M ${x - 2.6} ${y - h * 2.6} L ${x - 2.2} ${y - h * 0.9} M ${x + 2.6} ${y - h * 2.6} L ${x + 2.2} ${y - h * 0.9}`}
        stroke={shade(color, -30)}
        strokeWidth={1}
        opacity={0.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function FacialHair({
  x,
  y,
  style,
  hairColor,
  headRx,
  headRy,
}: {
  x: number;
  y: number;
  style: AvatarConfig['face']['facialHair'];
  hairColor: string;
  headRx: number;
  headRy: number;
}) {
  if (style === 'none') return null;
  const jawY = y + headRy * 0.55;
  if (style === 'stubble') {
    return (
      <path
        d={`M ${x - headRx * 0.78} ${jawY - 16} Q ${x} ${jawY + 14} ${x + headRx * 0.78} ${jawY - 16}
            L ${x + headRx * 0.68} ${jawY - 6} Q ${x} ${jawY + 20} ${x - headRx * 0.68} ${jawY - 6} Z`}
        fill={hairColor}
        opacity={0.22}
      />
    );
  }
  if (style === 'mustache') {
    return (
      <g fill={hairColor}>
        <path d={`M ${x - 12} ${y - 6.5} Q ${x - 5} ${y - 2.5}, ${x} ${y - 4} Q ${x + 5} ${y - 2.5}, ${x + 12} ${y - 6.5} Q ${x + 5} ${y - 0.5}, ${x} ${y - 1.8} Q ${x - 5} ${y - 0.5}, ${x - 12} ${y - 6.5} Z`} />
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8 - 0.5;
          return (
            <path
              key={i}
              d={`M ${x + t * 20} ${y - 5.5} q ${t * 3} 2.4 ${t * 5} 3.4`}
              stroke={shade(hairColor, -25)}
              strokeWidth={0.9}
              fill="none"
              opacity={0.7}
            />
          );
        })}
      </g>
    );
  }
  if (style === 'goatee') {
    return (
      <g fill={hairColor}>
        <path d={`M ${x - 12} ${y - 6.5} Q ${x} ${y - 1.5}, ${x + 12} ${y - 6.5} Q ${x + 5} ${y - 2.5}, ${x} ${y - 3.5} Q ${x - 5} ${y - 2.5}, ${x - 12} ${y - 6.5} Z`} />
        <path d={`M ${x - 9.5} ${y + 3} Q ${x - 10.5} ${jawY + 13}, ${x} ${jawY + 14} Q ${x + 10.5} ${jawY + 13}, ${x + 9.5} ${y + 3} Q ${x} ${y + 7}, ${x - 9.5} ${y + 3} Z`} />
      </g>
    );
  }
  return (
    <g>
      <path
        d={`M ${x - headRx * 0.9} ${jawY - 22}
            Q ${x - headRx * 0.84} ${jawY + 19}, ${x} ${jawY + 22}
            Q ${x + headRx * 0.84} ${jawY + 19}, ${x + headRx * 0.9} ${jawY - 22}
            L ${x + headRx * 0.72} ${jawY - 8}
            Q ${x + headRx * 0.52} ${jawY + 9}, ${x} ${jawY + 10}
            Q ${x - headRx * 0.52} ${jawY + 9}, ${x - headRx * 0.72} ${jawY - 8} Z`}
        fill={hairColor}
        opacity={0.97}
      />
      {Array.from({ length: 14 }).map((_, i) => {
        const t = i / 13 - 0.5;
        return (
          <path
            key={i}
            d={`M ${x + t * headRx * 1.2} ${jawY - 4} q ${t * 6} 10 ${t * 4} 18`}
            stroke={shade(hairColor, -30)}
            strokeWidth={1}
            fill="none"
            opacity={0.5}
          />
        );
      })}
    </g>
  );
}

export function lipColorFor(config: AvatarConfig): string {
  const { makeup } = config.face;
  if (makeup === 'bold') return '#a31621';
  if (makeup === 'natural') return '#c25a6b';
  return '#a9685e';
}

/** Shared face landmark math (also used for placing head accessories). */
export function faceLandmarks(geom: BodyGeom) {
  const { cx, headCy, headRx, headRy } = geom;
  return {
    cx,
    eyeY: headCy + 2,
    ex: 15.5,
    browY: headCy - 13,
    noseY: headCy + 10,
    noseTipY: headCy + 23,
    lipY: headCy + 32,
    earY: headCy + 8,
    chinY: geom.chinY,
    headRx,
    headRy,
  };
}

export default function Face({ config, geom, pose, skin }: FaceProps) {
  const { cx, headCy, headRx, headRy } = geom;
  const f = config.face;
  const shift = poseShift(pose, headRx);
  const profile = pose === 'side';
  const ex = 15.5;
  const eyeY = headCy + 2;
  const browY = headCy - 13;
  const noseY = headCy + 10;
  const lipY = headCy + 32;
  const iris: string = EYE_COLOR_HEX[f.eyeColor as EyeColor] ?? EYE_COLOR_HEX.brown;
  const lip = lipColorFor(config);
  const deep = shade(skin, -24);

  return (
    <g>
      {/* head base with photographic form */}
      <path d={headPath(geom)} fill={`url(#${faceId(skin)})`} />
      {/* forehead light */}
      <ellipse cx={cx} cy={headCy - headRy * 0.42} rx={headRx * 0.52} ry={headRy * 0.3} fill="#ffffff" opacity={0.16} filter={`url(#${SOFT6})`} />
      {/* cheekbone highlights */}
      <ellipse cx={cx - headRx * 0.52} cy={headCy + headRy * 0.12} rx={9} ry={5.5} fill="#ffffff" opacity={0.14} filter={`url(#${SOFT})`} transform={`rotate(-18 ${cx - headRx * 0.52} ${headCy + headRy * 0.12})`} />
      <ellipse cx={cx + headRx * 0.52} cy={headCy + headRy * 0.12} rx={9} ry={5.5} fill="#ffffff" opacity={0.14} filter={`url(#${SOFT})`} transform={`rotate(18 ${cx + headRx * 0.52} ${headCy + headRy * 0.12})`} />
      {/* temple + jaw modeling */}
      <path d={`M ${cx - headRx + 5} ${headCy - headRy * 0.55} Q ${cx - headRx + 11} ${headCy} ${cx - headRx + 8} ${headCy + headRy * 0.5}`} stroke={deep} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.22} filter={`url(#${SOFT})`} />
      <path d={`M ${cx + headRx - 5} ${headCy - headRy * 0.55} Q ${cx + headRx - 11} ${headCy} ${cx + headRx - 8} ${headCy + headRy * 0.5}`} stroke={deep} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.22} filter={`url(#${SOFT})`} />
      {/* chin light */}
      <ellipse cx={cx} cy={geom.chinY - 7} rx={8} ry={4} fill="#ffffff" opacity={0.14} filter={`url(#${SOFT})`} />

      {/* ears with inner detail */}
      <ellipse cx={cx - headRx + 2} cy={headCy + 8} rx={4.2} ry={7.2} fill={`url(#${skinCylId(skin)})`} />
      <ellipse cx={cx + headRx - 2} cy={headCy + 8} rx={4.2} ry={7.2} fill={`url(#${skinCylId(skin)})`} />
      <path d={`M ${cx - headRx + 3.4} ${headCy + 4} q -2.4 4 0.4 8.5 M ${cx + headRx - 3.4} ${headCy + 4} q 2.4 4 -0.4 8.5`} stroke={deep} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.65} />

      <g transform={`translate(${shift} 0)`}>
        {/* blush */}
        {f.makeup !== 'none' && (
          <g>
            <ellipse cx={cx - ex - 6} cy={lipY - 15} rx={10} ry={6} fill="url(#vss-blush)" />
            <ellipse cx={cx + ex + 6} cy={lipY - 15} rx={10} ry={6} fill="url(#vss-blush)" />
          </g>
        )}

        {/* brows */}
        {!profile && <Brow x={cx - ex} y={browY} style={f.brows} />}
        <Brow x={cx + (profile ? -ex * 0.35 : ex)} y={browY} style={f.brows} />

        {/* eyes */}
        {!profile && <Eye x={cx - ex} y={eyeY} shape={f.eyeShape} iris={iris} />}
        <Eye x={cx + (profile ? -ex * 0.35 : ex)} y={eyeY} shape={f.eyeShape} iris={iris} flip={profile} />

        {/* nose */}
        <Nose x={cx + shift * 0.3} y={noseY} shape={f.nose} profile={profile} skin={skin} />

        {/* facial hair */}
        <FacialHair x={cx} y={lipY} style={f.facialHair} hairColor={config.hair.color} headRx={headRx} headRy={headRy} />

        {/* lips */}
        <Lips x={cx + (profile ? -5 : 0)} y={lipY} shape={f.lips} color={lip} />

        {/* senior lines */}
        {config.ageGroup === 'senior' && (
          <g stroke={deep} strokeWidth={1.2} fill="none" opacity={0.6} strokeLinecap="round">
            <path d={`M ${cx - ex - 3} ${eyeY - 13.5} q 8 -3 15 0`} />
            <path d={`M ${cx + ex - 3} ${eyeY - 13.5} q 8 -3 15 0`} />
            <path d={`M ${cx - 13} ${lipY + 9} q -3 4 -6 5`} />
            <path d={`M ${cx + 13} ${lipY + 9} q 3 4 6 5`} />
            <path d={`M ${cx - 9} ${noseY + 15} q -4 2 -7 1`} />
            <path d={`M ${cx + 9} ${noseY + 15} q 4 2 7 1`} />
          </g>
        )}
      </g>
    </g>
  );
}

export { SKIN_TONES };
