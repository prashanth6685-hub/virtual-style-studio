import type { AvatarConfig, AvatarPose, EyeColor } from './types';
import { EYE_COLOR_HEX, SKIN_TONES } from './types';
import type { BodyGeom } from './body';
import { shade } from '../lib/color';

interface FaceProps {
  config: AvatarConfig;
  geom: BodyGeom;
  pose: AvatarPose;
  skin: string;
}

/** Horizontal feature shift that sells the turned poses (transform variants). */
function poseShift(pose: AvatarPose, headRx: number): number {
  if (pose === 'side') return -headRx * 0.42;
  if (pose === 'three-quarter') return -headRx * 0.16;
  return 0;
}

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
    almond: { rx: 7.6, ry: 4.4 },
    round: { rx: 7.2, ry: 5.6 },
    hooded: { rx: 7.4, ry: 4.0 },
    monolid: { rx: 7.0, ry: 2.9 },
  }[shape];
  const lashW = shape === 'hooded' ? 3.2 : shape === 'monolid' ? 2.4 : 2;
  const s = flip ? -1 : 1;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={dims.rx} ry={dims.ry} fill="#ffffff" />
      <circle cx={x} cy={y + 0.4} r={3.4} fill={iris} />
      <circle cx={x} cy={y + 0.4} r={1.6} fill="#1a1512" />
      <circle cx={x - 1.1} cy={y - 0.8} r={0.9} fill="#ffffff" opacity={0.9} />
      {/* upper lash line */}
      <path
        d={`M ${x - dims.rx * s} ${y - 0.5} Q ${x} ${y - dims.ry - 2.4} ${x + dims.rx * s} ${y - 1}`}
        fill="none"
        stroke="#2a2320"
        strokeWidth={lashW}
        strokeLinecap="round"
      />
      {shape === 'hooded' && (
        <path
          d={`M ${x - dims.rx} ${y - dims.ry - 1} Q ${x} ${y - dims.ry - 5} ${x + dims.rx} ${y - dims.ry - 1}`}
          fill="none"
          stroke="#2a2320"
          strokeWidth={1.6}
          opacity={0.55}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function Brow({
  x,
  y,
  style,
}: {
  x: number;
  y: number;
  style: AvatarConfig['face']['brows'];
}) {
  const w = { thin: 2, medium: 3.4, thick: 5, arched: 3.2, straight: 3 }[style];
  const d =
    style === 'arched'
      ? `M ${x - 10} ${y + 2} Q ${x} ${y - 6} ${x + 10} ${y - 1}`
      : style === 'straight'
        ? `M ${x - 10} ${y} L ${x + 10} ${y - 1}`
        : `M ${x - 10} ${y + 1} Q ${x} ${y - 3.5} ${x + 10} ${y}`;
  return <path d={d} fill="none" stroke="#2c231c" strokeWidth={w} strokeLinecap="round" />;
}

function Nose({
  x,
  y,
  shape,
  profile,
}: {
  x: number;
  y: number;
  shape: AvatarConfig['face']['nose'];
  profile: boolean;
}) {
  const c = '#00000022';
  if (profile) {
    // profile nose pointing left
    return (
      <path
        d={`M ${x + 4} ${y - 8} L ${x - 7} ${y + 2} Q ${x - 8} ${y + 5} ${x - 4} ${y + 6} L ${x + 2} ${y + 6}`}
        fill="none"
        stroke="#00000033"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    );
  }
  switch (shape) {
    case 'button':
      return (
        <path
          d={`M ${x - 4} ${y - 6} Q ${x} ${y + 5} ${x + 4} ${y - 6}`}
          fill="none"
          stroke={c}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      );
    case 'wide':
      return (
        <g fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round">
          <path d={`M ${x} ${y - 7} L ${x} ${y + 2}`} />
          <path d={`M ${x - 7} ${y + 1} Q ${x - 3} ${y + 5} ${x} ${y + 4}`} />
          <path d={`M ${x + 7} ${y + 1} Q ${x + 3} ${y + 5} ${x} ${y + 4}`} />
        </g>
      );
    case 'pointed':
      return (
        <path
          d={`M ${x} ${y - 8} L ${x - 3.5} ${y + 4} Q ${x} ${y + 7} ${x + 3.5} ${y + 4}`}
          fill="none"
          stroke={c}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      );
    case 'straight':
    default:
      return (
        <g fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round">
          <path d={`M ${x + 1} ${y - 8} L ${x - 1} ${y + 3}`} />
          <path d={`M ${x - 5} ${y + 2} Q ${x} ${y + 6} ${x + 5} ${y + 2}`} />
        </g>
      );
  }
}

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
  const w = { full: 13, medium: 11, thin: 9 }[shape];
  const h = { full: 7.5, medium: 5.5, thin: 3.6 }[shape];
  return (
    <g>
      <path
        d={`M ${x - w} ${y} Q ${x - w / 2} ${y - h * 0.9} ${x} ${y - h * 0.25} Q ${x + w / 2} ${y - h * 0.9} ${x + w} ${y} Q ${x} ${y + h * 0.55} ${x - w} ${y} Z`}
        fill={color}
      />
      <path
        d={`M ${x - w} ${y} Q ${x} ${y + h} ${x + w} ${y} Q ${x} ${y + h * 0.55} ${x - w} ${y} Z`}
        fill={shade(color, -14)}
        opacity={0.85}
      />
      <path
        d={`M ${x - w} ${y} Q ${x - w / 2} ${y - h * 0.9} ${x} ${y - h * 0.25} Q ${x + w / 2} ${y - h * 0.9} ${x + w} ${y}`}
        fill="none"
        stroke={shade(color, -30)}
        strokeWidth={1.2}
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
  return (
    <g>
      {style === 'stubble' && (
        <path
          d={`M ${x - headRx * 0.8} ${jawY - 14} Q ${x} ${jawY + 16} ${x + headRx * 0.8} ${jawY - 14} L ${x + headRx * 0.72} ${jawY - 4} Q ${x} ${jawY + 22} ${x - headRx * 0.72} ${jawY - 4} Z`}
          fill={hairColor}
          opacity={0.22}
        />
      )}
      {style === 'mustache' && (
        <path
          d={`M ${x - 12} ${y - 8} Q ${x} ${y - 2} ${x + 12} ${y - 8} Q ${x + 6} ${y - 4} ${x} ${y - 5} Q ${x - 6} ${y - 4} ${x - 12} ${y - 8} Z`}
          fill={hairColor}
        />
      )}
      {style === 'goatee' && (
        <g fill={hairColor}>
          <path
            d={`M ${x - 12} ${y - 8} Q ${x} ${y - 2} ${x + 12} ${y - 8} Q ${x + 6} ${y - 4} ${x} ${y - 5} Q ${x - 6} ${y - 4} ${x - 12} ${y - 8} Z`}
          />
          <ellipse cx={x} cy={jawY + 2} rx={10} ry={12} />
        </g>
      )}
      {style === 'beard' && (
        <path
          d={`M ${x - headRx * 0.92} ${jawY - 20} Q ${x - headRx * 0.7} ${jawY + 22} ${x} ${jawY + 24} Q ${x + headRx * 0.7} ${jawY + 22} ${x + headRx * 0.92} ${jawY - 20} L ${x + headRx * 0.78} ${jawY - 6} Q ${x} ${jawY + 12} ${x - headRx * 0.78} ${jawY - 6} Z`}
          fill={hairColor}
          opacity={0.96}
        />
      )}
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
  const ex = headRx * 0.46;
  return {
    cx,
    eyeY: headCy - headRy * 0.08,
    ex,
    browY: headCy - headRy * 0.08 - headRy * 0.32,
    noseY: headCy + headRy * 0.3,
    lipY: headCy + headRy * 0.66,
    earX: headRx,
    earY: headCy + 10,
  };
}

export default function Face({ config, geom, pose, skin }: FaceProps) {
  const { cx, headCy, headRx, headRy } = geom;
  const f = config.face;
  const shift = poseShift(pose, headRx);
  const profile = pose === 'side';
  const ex = headRx * 0.46;
  const eyeY = headCy - headRy * 0.08;
  const browY = eyeY - headRy * 0.32;
  const noseY = headCy + headRy * 0.3;
  const lipY = headCy + headRy * 0.66;
  const iris: string = EYE_COLOR_HEX[f.eyeColor as EyeColor] ?? EYE_COLOR_HEX.brown;
  const lip = lipColorFor(config);
  const undertoneTint =
    config.undertone === 'warm'
      ? { fill: '#ff9d5c', opacity: 0.07 }
      : config.undertone === 'cool'
        ? { fill: '#9db4ff', opacity: 0.06 }
        : null;

  return (
    <g>
      {/* ears */}
      <ellipse cx={cx - headRx + 1} cy={headCy + 4} rx={5} ry={8} fill={skin} />
      <ellipse cx={cx + headRx - 1} cy={headCy + 4} rx={5} ry={8} fill={skin} />
      <path
        d={`M ${cx - headRx + 1} ${headCy} q -2.5 4 0 8 M ${cx + headRx - 1} ${headCy} q 2.5 4 0 8`}
        stroke={shade(skin, -18)}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
      {/* head */}
      <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} fill={skin} />
      {undertoneTint && (
        <ellipse
          cx={cx}
          cy={headCy}
          rx={headRx * 0.94}
          ry={headRy * 0.94}
          fill={undertoneTint.fill}
          opacity={undertoneTint.opacity}
        />
      )}
      {/* subtle cheek shading */}
      <ellipse cx={cx - headRx * 0.55} cy={headCy + headRy * 0.35} rx={9} ry={6} fill={shade(skin, -8)} opacity={0.35} />
      <ellipse cx={cx + headRx * 0.55} cy={headCy + headRy * 0.35} rx={9} ry={6} fill={shade(skin, -8)} opacity={0.35} />

      <g transform={`translate(${shift} 0)`}>
        {/* blush / makeup */}
        {f.makeup !== 'none' && (
          <g>
            <ellipse cx={cx - ex - 4} cy={lipY - 12} rx={8} ry={5} fill="#e86a7a" opacity={f.makeup === 'bold' ? 0.4 : 0.22} />
            <ellipse cx={cx + ex + 4} cy={lipY - 12} rx={8} ry={5} fill="#e86a7a" opacity={f.makeup === 'bold' ? 0.4 : 0.22} />
            <path
              d={`M ${cx - ex - 8} ${eyeY - 7} Q ${cx - ex} ${eyeY - 11} ${cx - ex + 8} ${eyeY - 7}`}
              stroke="#b76e79"
              strokeWidth={f.makeup === 'bold' ? 3.4 : 2}
              fill="none"
              opacity={0.5}
              strokeLinecap="round"
            />
            <path
              d={`M ${cx + ex - 8} ${eyeY - 7} Q ${cx + ex} ${eyeY - 11} ${cx + ex + 8} ${eyeY - 7}`}
              stroke="#b76e79"
              strokeWidth={f.makeup === 'bold' ? 3.4 : 2}
              fill="none"
              opacity={0.5}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* brows */}
        {!profile && <Brow x={cx - ex} y={browY} style={f.brows} />}
        <Brow x={cx + (profile ? -ex * 0.4 : ex)} y={browY} style={f.brows} />

        {/* eyes */}
        {!profile && <Eye x={cx - ex} y={eyeY} shape={f.eyeShape} iris={iris} />}
        <Eye x={cx + (profile ? -ex * 0.4 : ex)} y={eyeY} shape={f.eyeShape} iris={iris} flip={profile} />

        {/* nose */}
        <Nose x={cx + shift * 0.4} y={noseY} shape={f.nose} profile={profile} />

        {/* facial hair behind lips */}
        <FacialHair
          x={cx}
          y={lipY}
          style={f.facialHair}
          hairColor={config.hair.color}
          headRx={headRx}
          headRy={headRy}
        />

        {/* lips */}
        <Lips x={cx + (profile ? -6 : 0)} y={lipY} shape={f.lips} color={lip} />

        {/* senior lines */}
        {config.ageGroup === 'senior' && (
          <g stroke={shade(skin, -25)} strokeWidth={1.3} fill="none" opacity={0.7} strokeLinecap="round">
            <path d={`M ${cx - ex - 2} ${eyeY - 12} q 8 -3 16 0`} />
            <path d={`M ${cx + ex - 2} ${eyeY - 12} q 8 -3 16 0`} />
            <path d={`M ${cx - 14} ${lipY + 10} q -3 4 -6 5`} />
            <path d={`M ${cx + 14} ${lipY + 10} q 3 4 6 5`} />
          </g>
        )}
      </g>
    </g>
  );
}

export { SKIN_TONES };
