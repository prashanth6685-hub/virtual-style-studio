import type { AvatarConfig, AvatarPose, HairStyle, HairTexture } from './types';
import type { BodyGeom } from './body';
import { shade } from '../lib/color';
import { hairId, SOFT } from './ids';

interface HairProps {
  config: AvatarConfig;
  geom: BodyGeom;
  pose: AvatarPose;
}

function shiftFor(pose: AvatarPose, rx: number): number {
  if (pose === 'side') return -rx * 0.42;
  if (pose === 'three-quarter') return -rx * 0.16;
  return 0;
}

/** Scalloped edge for curly/coily masses. */
function scallops(x0: number, x1: number, r: number): string {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / (r * 1.7)));
  const step = (x1 - x0) / n;
  let d = '';
  for (let i = 0; i < n; i++) d += ` a ${r} ${r} 0 0 1 ${step.toFixed(1)} 0`;
  return d;
}

/** Wavy edge. */
function waves(x0: number, x1: number, amp = 3.5): string {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 24));
  const step = (x1 - x0) / n;
  let d = '';
  for (let i = 0; i < n; i++)
    d += ` q ${(step / 2).toFixed(1)} ${(i % 2 === 0 ? -amp : amp).toFixed(1)} ${step.toFixed(1)} 0`;
  return d;
}

function edgeFor(texture: HairTexture, x0: number, x1: number): string {
  if (texture === 'curly' || texture === 'coily') return scallops(x0, x1, 7);
  if (texture === 'wavy') return waves(x0, x1);
  return '';
}

interface CapOpts {
  lift: number;
  side: number;
  hairline: number;
  fringe: 'none' | 'straight' | 'swept' | 'jagged';
  texture: HairTexture;
}

/** The cap: hair mass over the crown with a natural hairline. */
function capPath(g: BodyGeom, o: CapOpts): string {
  const { cx } = g;
  const crownY = g.headTopY;
  const hw = g.headRx + o.side;
  const topY = crownY - o.lift;
  const hlY = o.hairline;
  const sideBotY = hlY + 34;
  let d = `M ${cx - hw} ${sideBotY}`;
  d += ` C ${cx - hw - 3} ${hlY + 6}, ${cx - hw * 0.72} ${topY + 10}, ${cx - hw * 0.38} ${topY + 2}`;
  d += ` Q ${cx} ${topY - 6}, ${cx + hw * 0.38} ${topY + 2}`;
  d += ` C ${cx + hw * 0.72} ${topY + 10}, ${cx + hw + 3} ${hlY + 6}, ${cx + hw} ${sideBotY}`;
  const hlHW = g.foreheadHW + 2;
  if (o.fringe === 'straight') {
    d += ` L ${cx + hlHW} ${hlY + 2} q ${-hlHW * 0.5} 5 ${-hlHW} 2 q ${-hlHW * 0.5} 4 ${-hlHW} 0 Z`;
  } else if (o.fringe === 'swept') {
    d += ` Q ${cx + hlHW * 0.3} ${hlY + 8}, ${cx - hlHW} ${hlY + 1} Z`;
  } else if (o.fringe === 'jagged') {
    d += ` L ${cx + hlHW} ${hlY + 10} L ${cx + hlHW * 0.5} ${hlY + 2} L ${cx} ${hlY + 9} L ${cx - hlHW * 0.5} ${hlY + 2} L ${cx - hlHW} ${hlY + 10} Z`;
  } else {
    d += ` Q ${cx + hlHW * 0.55} ${hlY + 7}, ${cx + hlHW * 0.12} ${hlY + 4}`;
    d += ` Q ${cx} ${hlY + 7}, ${cx - hlHW * 0.12} ${hlY + 4}`;
    d += ` Q ${cx - hlHW * 0.55} ${hlY + 7}, ${cx - hlHW} ${hlY - 1} Z`;
  }
  return d;
}

/** Strand strokes. For a center-parted ('none') fringe they sweep down the
 *  SIDES of the head, starting outside the forehead so nothing crosses it. */
function strands(g: BodyGeom, color: string, lift: number, n = 7, spread = 1, fringe: 'none' | 'straight' | 'swept' | 'jagged' = 'none'): React.ReactNode {
  const { cx } = g;
  const topY = g.headTopY - lift;
  const els = [];
  let key = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    if (fringe === 'none' && Math.abs(t) < 0.75) continue; // keep forehead fully clear
    const light = (i % 3 === 0);
    let d: string;
    if (fringe === 'none') {
      // side sweep: start at the head's edge, bow outward, fall long
      const sx = cx + Math.sign(t) * (g.headRx + 3);
      const ex = cx + Math.sign(t) * (g.headRx + 13) * spread;
      const len = 52 + Math.abs(t) * 10;
      d = `M ${sx.toFixed(1)} ${topY + 8} Q ${(sx + Math.sign(t) * 10).toFixed(1)} ${topY + 26}, ${ex.toFixed(1)} ${topY + len}`;
    } else {
      const sx = cx + t * g.headRx * 0.5;
      const ex = cx + t * (g.headRx + 12) * spread;
      d = `M ${sx.toFixed(1)} ${topY + 3} Q ${(sx + t * 9).toFixed(1)} ${topY + 24}, ${ex.toFixed(1)} ${topY + 46 + Math.abs(t) * 8}`;
    }
    els.push(
      <path
        key={key++}
        d={d}
        fill="none"
        stroke={shade(color, light ? 26 : -20)}
        strokeWidth={light ? 1.2 : 1.5}
        opacity={light ? 0.42 : 0.48}
        strokeLinecap="round"
      />,
    );
  }
  return <g>{els}</g>;
}

/** Soft shine band across the crown. */
function rootShadow(g: BodyGeom, hlY: number): React.ReactNode {
  const { cx } = g;
  return (
    <path
      d={`M ${cx - g.foreheadHW - 2} ${hlY + 2} Q ${cx} ${hlY + 12} ${cx + g.foreheadHW + 2} ${hlY + 2} L ${cx + g.foreheadHW} ${hlY + 9} Q ${cx} ${hlY + 18} ${cx - g.foreheadHW} ${hlY + 9} Z`}
      fill="#1a0f08"
      opacity={0.28}
      filter={`url(#${SOFT})`}
    />
  );
}

/** Soft shine band across the crown. */
function shine(g: BodyGeom, lift: number): React.ReactNode {
  const { cx } = g;
  const topY = g.headTopY - lift;
  return (
    <path
      d={`M ${cx - g.headRx * 0.55} ${topY + 8} Q ${cx} ${topY - 2} ${cx + g.headRx * 0.6} ${topY + 10}`}
      fill="none"
      stroke="#ffffff"
      strokeWidth={7}
      opacity={0.16}
      strokeLinecap="round"
      filter={`url(#${SOFT})`}
    />
  );
}

/** Breaks the hard helmet edge on short styles: irregular strand tips along
 *  the front hairline plus sideburn flicks, so short cuts don't read as a
 *  Lego cap. Deterministic (no Math.random) to keep identity stable. */
function shortHairlineBreak(g: BodyGeom, color: string, hlY: number): React.ReactNode {
  const { cx } = g;
  const els: React.ReactNode[] = [];
  const dark = shade(color, -8);
  // front hairline: 9 strand tips of varying length
  for (let i = 0; i < 9; i++) {
    const t = i / 8 - 0.5;
    const x = cx + t * g.foreheadHW * 1.75 + (i % 2 ? 1.6 : -1.6);
    const y = hlY + 1 + Math.abs(t) * 4;
    const len = 3 + ((i * 7) % 5);
    els.push(
      <path
        key={`f${i}`}
        d={`M ${x.toFixed(1)} ${y.toFixed(1)} l ${(t * 6).toFixed(1)} ${len.toFixed(1)}`}
        stroke={dark}
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.85}
        fill="none"
      />,
    );
  }
  // sideburns: 3 flicks each side
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = cx + s * (g.headRx + 1 - i * 1.5);
      const y = hlY + 18 + i * 7;
      els.push(
        <path
          key={`s${s}${i}`}
          d={`M ${x.toFixed(1)} ${y.toFixed(1)} l ${s * 2} ${6 + i * 2}`}
          stroke={dark}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.85}
          fill="none"
        />,
      );
    }
  }
  return <g>{els}</g>;
}

/** Fine baby hairs along the hairline — kills the "helmet" edge. */
function hairlineDetail(g: BodyGeom, color: string, hlY: number): React.ReactNode {
  const { cx } = g;
  const els = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const x = cx + t * g.foreheadHW * 1.7;
    els.push(
      <path
        key={i}
        d={`M ${x.toFixed(1)} ${hlY + 1} q ${(t * 4).toFixed(1)} 3 ${(t * 7).toFixed(1)} 6`}
        fill="none"
        stroke={shade(color, -12)}
        strokeWidth={0.9}
        opacity={0.4}
        strokeLinecap="round"
      />,
    );
  }
  return <g>{els}</g>;
}

function braidPath(x: number, y0: number, y1: number, w: number, color: string, key: string): React.ReactNode {
  const segs = Math.max(3, Math.round((y1 - y0) / 15));
  const els = [];
  for (let i = 0; i < segs; i++) {
    const yy = y0 + ((y1 - y0) / segs) * i;
    const off = i % 2 === 0 ? w * 0.3 : -w * 0.3;
    els.push(
      <g key={i}>
        <ellipse cx={x + off} cy={yy + 7.5} rx={w * 0.66} ry={8.6} fill={i % 2 ? shade(color, -14) : color} />
        <path d={`M ${x + off - w * 0.4} ${yy + 3} q ${w * 0.4} 4 0 9`} stroke={shade(color, 18)} strokeWidth={1.2} fill="none" opacity={0.6} />
      </g>,
    );
  }
  return (
    <g key={key}>
      {els}
      <circle cx={x} cy={y1 + 5} r={4.2} fill="#c65b7c" />
      <circle cx={x} cy={y1 + 5} r={4.2} fill="none" stroke={shade('#c65b7c', -25)} strokeWidth={1} />
    </g>
  );
}

/** Back layer: everything that falls behind the head/shoulders. */
export function HairBack({ config, geom, pose }: HairProps) {
  const { cx } = geom;
  const { color, style, texture, length } = config.hair;
  const shift = shiftFor(pose, geom.headRx);
  if (texture === 'bald') return null;
  const hg = `url(#${hairId(color)})`;
  const dark = shade(color, -16);

  let back: React.ReactNode = null;

  if (style === 'long' || (length === 'long' && style !== 'ponytail' && style !== 'bun')) {
    const topY = geom.headTopY - 6;
    const hw = geom.headRx + 15;
    const botY = geom.shoulderY + 118;
    back = (
      <g>
        <path
          d={`M ${cx - hw} ${topY + 20}
              C ${cx - hw - 6} ${topY + 70}, ${cx - hw + 2} ${botY - 60}, ${cx - hw + 8} ${botY}
              ${edgeFor(texture, cx - hw + 8, cx + hw - 8)}
              C ${cx + hw - 2} ${botY - 60}, ${cx + hw + 6} ${topY + 70}, ${cx + hw} ${topY + 20}
              Q ${cx} ${topY - 14}, ${cx - hw} ${topY + 20} Z`}
          fill={hg}
        />
        {strands({ ...geom, headTopY: topY + 10 } as BodyGeom, color, -6, 7)}
      </g>
    );
  } else if (style === 'ponytail') {
    const px = cx + geom.headRx + 6;
    back = (
      <g>
        <path
          d={`M ${px - 8} ${geom.headTopY + 6}
              C ${px + 14} ${geom.headTopY + 60}, ${px + 18} ${geom.shoulderY + 40}, ${px + 10} ${geom.shoulderY + 108}
              Q ${px + 2} ${geom.shoulderY + 118}, ${px - 6} ${geom.shoulderY + 108}
              C ${px - 2} ${geom.headTopY + 60}, ${px - 10} ${geom.headTopY + 30}, ${px - 8} ${geom.headTopY + 6} Z`}
          fill={hg}
        />
        <path d={`M ${px - 2} ${geom.headTopY + 20} Q ${px + 8} ${geom.shoulderY + 40}, ${px + 4} ${geom.shoulderY + 90}`} stroke={shade(color, 24)} strokeWidth={2} fill="none" opacity={0.55} strokeLinecap="round" />
        <path d={`M ${px + 4} ${geom.headTopY + 24} Q ${px + 12} ${geom.shoulderY + 50}, ${px + 8} ${geom.shoulderY + 96}`} stroke={dark} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
        <ellipse cx={px - 4} cy={geom.headTopY + 10} rx={9} ry={7} fill={dark} />
      </g>
    );
  } else if (style === 'pigtails') {
    back = (
      <g fill={hg}>
        {[-1, 1].map((s) => {
          const px = cx + s * (geom.headRx + 10);
          return (
            <g key={s}>
              <path
                d={`M ${px - 7} ${geom.headTopY + 16}
                    C ${px + s * 12} ${geom.headTopY + 60}, ${px + s * 14} ${geom.shoulderY + 30}, ${px + s * 8} ${geom.shoulderY + 78}
                    Q ${px + s * 2} ${geom.shoulderY + 86}, ${px - s * 2} ${geom.shoulderY + 76}
                    C ${px + s * 4} ${geom.headTopY + 50}, ${px - 8} ${geom.headTopY + 40}, ${px - 7} ${geom.headTopY + 16} Z`}
              />
              <path d={`M ${px + s * 2} ${geom.headTopY + 30} Q ${px + s * 8} ${geom.headTopY + 60}, ${px + s * 6} ${geom.shoulderY + 60}`} stroke={shade(color, 22)} strokeWidth={1.6} fill="none" opacity={0.55} strokeLinecap="round" />
            </g>
          );
        })}
      </g>
    );
  } else if (style === 'braids') {
    back = (
      <g>
        {braidPath(cx - 26, geom.headTopY + 30, geom.shoulderY + 120, 13, color, 'b1')}
        {braidPath(cx + 26, geom.headTopY + 30, geom.shoulderY + 120, 13, color, 'b2')}
      </g>
    );
  } else if (style === 'afro') {
    const r = geom.headRx + 26;
    back = (
      <g>
        <path
          d={`M ${cx - r} ${geom.headCy + 6} ${scallops(cx - r, cx + r, 11)}
              Q ${cx + r + 6} ${geom.headCy - r * 0.7}, ${cx} ${geom.headTopY - r * 0.72}
              Q ${cx - r - 6} ${geom.headCy - r * 0.7}, ${cx - r} ${geom.headCy + 6} Z`}
          fill={hg}
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const t = i / 11 - 0.5;
          return <circle key={i} cx={cx + t * r * 1.5} cy={geom.headTopY - r * 0.3 + Math.abs(t) * r * 0.5} r={2.2} fill={shade(color, 20)} opacity={0.5} />;
        })}
      </g>
    );
  } else if (style === 'bob') {
    const hw = geom.headRx + 12;
    const botY = geom.chinY + 42;
    back = (
      <path
        d={`M ${cx - hw} ${geom.headTopY + 10}
            C ${cx - hw - 4} ${geom.headCy + 30}, ${cx - hw + 2} ${botY - 20}, ${cx - hw + 6} ${botY}
            ${edgeFor(texture, cx - hw + 6, cx + hw - 6)}
            C ${cx + hw - 2} ${botY - 20}, ${cx + hw + 4} ${geom.headCy + 30}, ${cx + hw} ${geom.headTopY + 10}
            Q ${cx} ${geom.headTopY - 10}, ${cx - hw} ${geom.headTopY + 10} Z`}
        fill={hg}
      />
    );
  } else if (style === 'bun' || style === 'man-bun') {
    back = (
      <g>
        <circle cx={cx} cy={geom.headTopY - 14} r={13} fill={hg} />
        <path d={`M ${cx - 12} ${geom.headTopY - 16} a 12 12 0 0 1 20 -6`} fill="none" stroke={shade(color, 25)} strokeWidth={2.4} opacity={0.6} strokeLinecap="round" />
      </g>
    );
  }

  if (!back) return null;
  return <g transform={`translate(${shift} 0)`}>{back}</g>;
}

/** Front layer: cap + hairline + strands + shine. */
export function HairTop({ config, geom, pose }: HairProps) {
  const { cx } = geom;
  const { color, style, texture } = config.hair;
  const shift = shiftFor(pose, geom.headRx);
  if (texture === 'bald') return null;
  const hg = `url(#${hairId(color)})`;
  const dark = shade(color, -14);
  const hlY = geom.headCy - geom.headRy * 0.52;

  let cap: React.ReactNode = null;
  let lift = 12;
  let strandCount = 7;
  let fringe: 'none' | 'straight' | 'swept' | 'jagged' = 'none';

  switch (style) {
    case 'buzz':
      fringe = 'none';
      lift = 4; strandCount = 0;
      cap = (
        <path
          d={`M ${cx - geom.headRx - 2} ${hlY + 26}
              Q ${cx - geom.headRx - 4} ${geom.headTopY - 2}, ${cx} ${geom.headTopY - 4}
              Q ${cx + geom.headRx + 4} ${geom.headTopY - 2}, ${cx + geom.headRx + 2} ${hlY + 26}
              Q ${cx} ${hlY + 14}, ${cx - geom.headRx - 2} ${hlY + 26} Z`}
          fill={color}
          opacity={0.92}
        />
      );
      break;
    case 'fade':
      fringe = 'none';
      lift = 9; strandCount = 4;
      cap = (
        <g>
          <path d={capPath(geom, { lift: 9, side: 2, hairline: hlY, fringe: 'none', texture })} fill={dark} opacity={0.9} />
          <path d={capPath(geom, { lift: 12, side: -4, hairline: hlY - 2, fringe: 'none', texture })} fill={hg} />
        </g>
      );
      break;
    case 'crew':
      fringe = 'none';
      lift = 10;
      cap = <path d={capPath(geom, { lift: 10, side: 5, hairline: hlY, fringe: 'none', texture })} fill={hg} />;
      break;
    case 'side-part':
      fringe = 'swept';
      lift = 13; strandCount = 11;
      cap = <path d={capPath(geom, { lift: 13, side: 7, hairline: hlY, fringe: 'swept', texture })} fill={hg} />;
      break;
    case 'curly-top': {
      lift = 20; strandCount = 0;
      const hw = geom.headRx + 10;
      cap = (
        <g>
          <path
            d={`M ${cx - hw} ${hlY + 20} ${scallops(cx - hw, cx + hw, 8)}
                Q ${cx + hw + 4} ${geom.headTopY - 18}, ${cx} ${geom.headTopY - 22}
                Q ${cx - hw - 4} ${geom.headTopY - 18}, ${cx - hw} ${hlY + 20}
                Q ${cx} ${hlY + 8}, ${cx - hw} ${hlY + 20} Z`}
            fill={hg}
          />
          {Array.from({ length: 16 }).map((_, i) => {
            const t = i / 15 - 0.5;
            return <circle key={i} cx={cx + t * hw * 1.5} cy={geom.headTopY - 8 + Math.abs(t) * 22} r={3.1} fill={shade(color, i % 3 ? -10 : 22)} opacity={0.55} />;
          })}
        </g>
      );
      break;
    }
    case 'messy':
      fringe = 'swept';
      lift = 17; strandCount = 6;
      cap = (
        <path
          d={`M ${cx - geom.headRx - 8} ${hlY + 26}
              L ${cx - geom.headRx - 2} ${geom.headTopY - 6} L ${cx - geom.headRx * 0.4} ${geom.headTopY - 14}
              L ${cx - 6} ${geom.headTopY - 20} L ${cx + 8} ${geom.headTopY - 12}
              L ${cx + geom.headRx * 0.5} ${geom.headTopY - 16} L ${cx + geom.headRx + 6} ${geom.headTopY - 4}
              L ${cx + geom.headRx + 8} ${hlY + 26}
              Q ${cx} ${hlY + 6}, ${cx - geom.headRx - 8} ${hlY + 26} Z`}
          fill={hg}
        />
      );
      break;
    case 'pixie':
      fringe = 'swept';
      lift = 12; strandCount = 8;
      cap = <path d={capPath(geom, { lift: 12, side: 6, hairline: hlY, fringe: 'swept', texture })} fill={hg} />;
      break;
    case 'bob':
      fringe = 'straight';
      lift = 13; strandCount = 8;
      cap = (
        <g>
          <path d={capPath(geom, { lift: 13, side: 11, hairline: hlY, fringe: 'straight', texture })} fill={hg} />
          <path d={`M ${cx - geom.headRx - 11} ${hlY + 20} Q ${cx - geom.headRx - 13} ${geom.headCy + 30}, ${cx - geom.headRx - 7} ${geom.chinY + 34} L ${cx - geom.headRx + 2} ${geom.chinY + 30} Q ${cx - geom.headRx - 2} ${geom.headCy + 10}, ${cx - geom.headRx - 4} ${hlY + 22} Z`} fill={hg} />
          <path d={`M ${cx + geom.headRx + 11} ${hlY + 20} Q ${cx + geom.headRx + 13} ${geom.headCy + 30}, ${cx + geom.headRx + 7} ${geom.chinY + 34} L ${cx + geom.headRx - 2} ${geom.chinY + 30} Q ${cx + geom.headRx + 2} ${geom.headCy + 10}, ${cx + geom.headRx + 4} ${hlY + 22} Z`} fill={hg} />
        </g>
      );
      break;
    case 'long':
      fringe = 'none';
      lift = 13; strandCount = 11;
      cap = <path d={capPath(geom, { lift: 13, side: 9, hairline: hlY, fringe: 'none', texture })} fill={hg} />;
      break;
    case 'ponytail':
      fringe = 'swept';
      lift = 13; strandCount = 11;
      cap = <path d={capPath(geom, { lift: 13, side: 9, hairline: hlY, fringe: 'swept', texture })} fill={hg} />;
      break;
    case 'bun':
    case 'man-bun':
      fringe = 'none';
      lift = 10; strandCount = 6;
      cap = (
        <g>
          <path d={capPath(geom, { lift: 10, side: 5, hairline: hlY, fringe: 'none', texture })} fill={hg} />
          <circle cx={cx} cy={geom.headTopY - 14} r={12} fill={hg} />
          <path d={`M ${cx - 11} ${geom.headTopY - 17} a 11 11 0 0 1 19 -5`} fill="none" stroke={shade(color, 28)} strokeWidth={2.2} opacity={0.65} strokeLinecap="round" />
        </g>
      );
      break;
    case 'braids':
      fringe = 'straight';
      lift = 13; strandCount = 5;
      cap = (
        <g>
          <path d={capPath(geom, { lift: 13, side: 8, hairline: hlY, fringe: 'straight', texture })} fill={hg} />
          <path d={`M ${cx} ${geom.headTopY - 8} L ${cx} ${hlY + 2}`} stroke={dark} strokeWidth={2} opacity={0.7} />
        </g>
      );
      break;
    case 'afro': {
      lift = 24; strandCount = 0;
      const r = geom.headRx + 24;
      cap = (
        <g>
          <path
            d={`M ${cx - r * 0.8} ${hlY + 30} ${scallops(cx - r * 0.8, cx + r * 0.8, 10)}
                Q ${cx + r} ${geom.headTopY - r * 0.5}, ${cx} ${geom.headTopY - r * 0.62}
                Q ${cx - r} ${geom.headTopY - r * 0.5}, ${cx - r * 0.8} ${hlY + 30}
                Q ${cx} ${hlY + 12}, ${cx - r * 0.8} ${hlY + 30} Z`}
            fill={hg}
          />
          <ellipse cx={cx - r * 0.3} cy={geom.headTopY - r * 0.35} rx={r * 0.4} ry={r * 0.28} fill="#ffffff" opacity={0.1} filter={`url(#${SOFT})`} />
        </g>
      );
      break;
    }
    case 'pigtails':
      fringe = 'straight';
      lift = 13; strandCount = 7;
      cap = <path d={capPath(geom, { lift: 13, side: 8, hairline: hlY, fringe: 'straight', texture })} fill={hg} />;
      break;
    default:
      lift = 12;
      cap = <path d={capPath(geom, { lift: 12, side: 6, hairline: hlY, fringe: 'none', texture })} fill={hg} />;
  }

  return (
    <g transform={`translate(${shift} 0)`}>
      {cap}
      {strandCount > 0 && strands(geom, color, lift, strandCount, 1, fringe)}
      {rootShadow(geom, hlY)}
      {style !== 'buzz' && style !== 'fade' && shine(geom, lift)}
      {style !== 'buzz' && style !== 'fade' && fringe !== 'none' && hairlineDetail(geom, color, hlY)}
      {['crew', 'buzz', 'fade', 'side-part', 'messy', 'curly-top'].includes(style) &&
        shortHairlineBreak(geom, color, hlY)}
    </g>
  );
}
