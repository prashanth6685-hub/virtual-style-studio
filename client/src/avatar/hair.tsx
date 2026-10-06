import type { AvatarConfig, AvatarPose, HairStyle, HairTexture } from './types';
import type { BodyGeom } from './body';
import { shade } from '../lib/color';

interface HairProps {
  config: AvatarConfig;
  geom: BodyGeom;
  pose: AvatarPose;
}

const TAU = Math.PI * 2;

function shiftFor(pose: AvatarPose, rx: number): number {
  if (pose === 'side') return -rx * 0.42;
  if (pose === 'three-quarter') return -rx * 0.16;
  return 0;
}

/** Scalloped (curly/coily) edge from (x0,y) to (x1,y): bumps semicircles. */
function scallopEdge(x0: number, x1: number, y: number, r: number, dir: 1 | -1 = 1): string {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / (r * 1.6)));
  const step = (x1 - x0) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const sx = x0 + step * i;
    d += ` a ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${step.toFixed(1)} 0`;
    void sx;
  }
  return d;
}

/** Wavy edge using small quadratic bumps. */
function waveEdge(x0: number, x1: number, y: number, amp = 4): string {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 26));
  const step = (x1 - x0) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const sx = x0 + step * i;
    d += ` q ${(step / 2).toFixed(1)} ${(i % 2 === 0 ? -amp : amp).toFixed(1)} ${step.toFixed(1)} 0`;
    void sx;
  }
  return d;
}

interface HairPlan {
  capLift: number; // extra height above crown
  hairline: number; // 0..1 forehead coverage (0 = high hairline)
  fringe: 'none' | 'straight' | 'swept';
  sideLen: number; // px below temple for side panels (bob etc.)
  backLen: number; // px below crown for back hair
  extras: HairStyle[];
}

function planFor(style: HairStyle, texture: HairTexture): HairPlan {
  const p: HairPlan = { capLift: 14, hairline: 0.35, fringe: 'none', sideLen: 0, backLen: 0, extras: [] };
  switch (style) {
    case 'buzz': p.capLift = 5; p.hairline = 0.12; break;
    case 'crew': p.capLift = 10; p.hairline = 0.2; break;
    case 'fade': p.capLift = 8; p.hairline = 0.15; break;
    case 'side-part': p.capLift = 13; p.hairline = 0.3; p.fringe = 'swept'; break;
    case 'curly-top': p.capLift = 20; p.hairline = 0.3; p.fringe = 'straight'; break;
    case 'man-bun': p.capLift = 10; p.hairline = 0.25; p.extras = ['man-bun']; break;
    case 'messy': p.capLift = 18; p.hairline = 0.35; p.fringe = 'swept'; break;
    case 'pixie': p.capLift = 12; p.hairline = 0.42; p.fringe = 'swept'; p.sideLen = 14; break;
    case 'bob': p.capLift = 14; p.hairline = 0.4; p.fringe = 'straight'; p.sideLen = 52; p.backLen = 40; break;
    case 'long': p.capLift = 14; p.hairline = 0.35; p.backLen = 150; break;
    case 'ponytail': p.capLift = 14; p.hairline = 0.35; p.fringe = 'swept'; p.extras = ['ponytail']; break;
    case 'bun': p.capLift = 12; p.hairline = 0.35; p.extras = ['bun']; break;
    case 'braids': p.capLift = 14; p.hairline = 0.4; p.fringe = 'straight'; p.extras = ['braids']; break;
    case 'afro': p.capLift = 14; p.hairline = 0.3; p.extras = ['afro']; break;
    case 'pigtails': p.capLift = 14; p.hairline = 0.4; p.fringe = 'straight'; p.extras = ['pigtails']; break;
  }
  if (texture === 'bald') {
    p.capLift = 0; p.hairline = 0; p.backLen = 0; p.sideLen = 0; p.extras = [];
  }
  return p;
}

/** Back layer: long fall, ponytail, pigtails, braids — drawn behind the body. */
export function HairBack({ config, geom, pose }: HairProps) {
  const { cx, headCy, headRx, headRy, shoulderY, chinY } = geom;
  const { color, texture, style } = config.hair;
  if (texture === 'bald') return null;
  const plan = planFor(style, texture);
  const shift = shiftFor(pose, headRx);
  const dark = shade(color, -18);
  const X = (v: number) => v + shift;

  const els: React.ReactNode[] = [];
  const key = (n: string) => `hb-${n}`;

  if (plan.backLen > 0) {
    const topY = headCy - headRy * 0.4;
    const botY = headCy + plan.backLen;
    const wTop = headRx + 6;
    const wBot = headRx + 16;
    let bottom = '';
    if (texture === 'curly' || texture === 'coily') {
      bottom = `M ${X(cx - wBot)} ${botY} ` + scallopEdge(X(cx - wBot), X(cx + wBot), botY, 9) + ' ';
    } else if (texture === 'wavy') {
      bottom = `M ${X(cx - wBot)} ${botY} ` + waveEdge(X(cx - wBot), X(cx + wBot), botY) + ' ';
    }
    els.push(
      <path
        key={key('fall')}
        d={`M ${X(cx - wTop)} ${topY}
            C ${X(cx - wTop - 10)} ${topY + 60}, ${X(cx - wBot)} ${botY - 60}, ${X(cx - wBot)} ${botY}
            ${bottom || `L ${X(cx + wBot)} ${botY}`}
            C ${X(cx + wBot)} ${botY - 60}, ${X(cx + wTop + 10)} ${topY + 60}, ${X(cx + wTop)} ${topY}
            Q ${X(cx)} ${topY - 26} ${X(cx - wTop)} ${topY} Z`}
        fill={color}
      />,
    );
    // sheen
    els.push(
      <path
        key={key('sheen')}
        d={`M ${X(cx - wTop + 8)} ${topY + 10} C ${X(cx - wTop)} ${topY + 80} ${X(cx - wBot + 10)} ${botY - 50} ${X(cx - wBot + 14)} ${botY - 20}`}
        stroke={shade(color, 22)}
        strokeWidth={5}
        fill="none"
        opacity={0.5}
        strokeLinecap="round"
      />,
    );
  }

  if (plan.extras.includes('ponytail')) {
    const sx = X(cx + headRx * 0.5);
    const sy = headCy - headRy - 6;
    els.push(
      <path
        key={key('pony')}
        d={`M ${sx} ${sy} C ${sx + 26} ${sy + 30} ${sx + 30} ${sy + 80} ${sx + 16} ${sy + 118}
            C ${sx + 10} ${sy + 90} ${sx + 2} ${sy + 50} ${sx - 8} ${sy + 6} Z`}
        fill={color}
      />,
    );
    els.push(<ellipse key={key('pony-tie')} cx={sx} cy={sy + 4} rx={7} ry={5} fill={dark} />);
  }

  if (plan.extras.includes('pigtails')) {
    for (const s of [-1, 1]) {
      const sx = X(cx + s * (headRx + 2));
      const sy = headCy - headRy * 0.5;
      const ex = X(cx + s * (headRx + 26));
      const ey = sy + 74;
      els.push(
        <path
          key={key(`pig-${s}`)}
          d={`M ${sx - 6} ${sy} C ${sx + s * 22} ${sy + 20} ${ex} ${ey - 30} ${ex - s * 4} ${ey}
              L ${ex - s * 16} ${ey - 4} C ${ex - s * 12} ${ey - 34} ${sx + s * 8} ${sy + 18} ${sx - 12} ${sy + 4} Z`}
          fill={color}
        />,
      );
      els.push(
        <ellipse key={key(`pig-tie-${s}`)} cx={sx} cy={sy + 2} rx={6} ry={5} fill="#d95f3d" />,
      );
    }
  }

  if (plan.extras.includes('braids')) {
    for (const s of [-1, 1]) {
      const bx = X(cx + s * (headRx * 0.72));
      const by = headCy - 6;
      const segs: React.ReactNode[] = [];
      const n = 7;
      for (let i = 0; i < n; i++) {
        const yy = by + i * 20;
        const xx = bx + s * Math.sin(i * 0.9) * 5;
        segs.push(
          <ellipse key={i} cx={xx} cy={yy} rx={10 - i * 0.7} ry={11} fill={i % 2 ? dark : color} />,
        );
      }
      els.push(
        <g key={key(`braid-${s}`)}>
          {segs}
          <ellipse cx={bx + s * Math.sin((n - 1) * 0.9) * 5} cy={by + (n - 1) * 20 + 12} rx={5} ry={7} fill="#d95f3d" />
        </g>,
      );
    }
  }

  // afro back cloud — drawn behind the head/face; front puffs live in HairTop
  if (plan.extras.includes('afro')) {
    const r = headRx * 1.72;
    const puffs: React.ReactNode[] = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const px = cx + Math.cos(a) * r * 0.92 + shift;
      const py = headCy - headRy * 0.25 + Math.sin(a) * r * 0.98;
      puffs.push(<circle key={i} cx={px} cy={py} r={r * 0.44} fill={i % 3 ? color : dark} />);
    }
    els.push(
      <g key={key('afro-back')}>
        {puffs}
        <circle cx={cx + shift} cy={headCy - headRy * 0.25} r={r * 0.98} fill={color} />
      </g>,
    );
  }

  void shoulderY;
  void chinY;
  return <g>{els}</g>;
}

/** Top layer: scalp cap + style extras — drawn over the face top. */
export function HairTop({ config, geom, pose }: HairProps) {
  const { cx, headCy, headRx, headRy, chinY } = geom;
  const { color, texture, style } = config.hair;
  if (texture === 'bald') {
    // subtle scalp shine
    return (
      <ellipse cx={cx} cy={headCy - headRy * 0.55} rx={headRx * 0.5} ry={headRy * 0.28} fill="#ffffff" opacity={0.14} />
    );
  }
  const plan = planFor(style, texture);
  const shift = shiftFor(pose, headRx);
  const dark = shade(color, -20);
  const light = shade(color, 18);
  const X = (v: number) => v + shift;

  const crownY = headCy - headRy;
  const capTopY = crownY - plan.capLift;
  const templeY = headCy - headRy * 0.12;
  const hairlineY = headCy - headRy * (0.62 - plan.hairline * 0.5);

  // afro front puffs — top arc only, face stays visible (back cloud is in HairBack)
  if (plan.extras.includes('afro')) {
    const r = headRx * 1.72;
    const puffs: React.ReactNode[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      // arc across the top of the head (from ~200° to ~340°)
      const a = Math.PI * (1.12 + (i / (n - 1)) * 0.76);
      const px = cx + Math.cos(a) * r * 0.95 + shift;
      const py = headCy - headRy * 0.25 + Math.sin(a) * r * 1.0;
      puffs.push(<circle key={i} cx={px} cy={py} r={r * 0.4} fill={i % 3 ? color : dark} />);
    }
    // hairline edge over the forehead
    puffs.push(
      <path
        key="afro-hairline"
        d={`M ${X(cx - headRx * 0.95)} ${headCy - headRy * 0.35}
            Q ${X(cx)} ${headCy - headRy * 0.62} ${X(cx + headRx * 0.95)} ${headCy - headRy * 0.35}
            L ${X(cx + headRx * 0.95)} ${headCy - headRy * 0.1}
            Q ${X(cx)} ${headCy - headRy * 0.34} ${X(cx - headRx * 0.95)} ${headCy - headRy * 0.1} Z`}
        fill={color}
      />,
    );
    return <g>{puffs}</g>;
  }

  const capPath = `
    M ${X(cx - headRx * 1.02)} ${templeY + 4}
    C ${X(cx - headRx * 1.08)} ${capTopY + 8}, ${X(cx - headRx * 0.55)} ${capTopY}, ${X(cx)} ${capTopY}
    C ${X(cx + headRx * 0.55)} ${capTopY}, ${X(cx + headRx * 1.08)} ${capTopY + 8}, ${X(cx + headRx * 1.02)} ${templeY + 4}
    L ${X(cx + headRx * 1.02)} ${templeY + 2}
    ${plan.fringe === 'straight'
      ? `Q ${X(cx + headRx * 0.5)} ${hairlineY + 6} ${X(cx)} ${hairlineY + 4} Q ${X(cx - headRx * 0.5)} ${hairlineY + 6} ${X(cx - headRx * 1.02)} ${templeY + 2} Z`
      : plan.fringe === 'swept'
        ? `Q ${X(cx + headRx * 0.7)} ${hairlineY - 2} ${X(cx + headRx * 0.1)} ${hairlineY + 8} Q ${X(cx - headRx * 0.5)} ${hairlineY + 2} ${X(cx - headRx * 1.02)} ${templeY + 2} Z`
        : `Q ${X(cx + headRx * 0.62)} ${hairlineY - 4} ${X(cx)} ${hairlineY} Q ${X(cx - headRx * 0.62)} ${hairlineY - 4} ${X(cx - headRx * 1.02)} ${templeY + 2} Z`}
  `;

  const els: React.ReactNode[] = [
    <path key="cap" d={capPath} fill={color} />,
    <path
      key="cap-sheen"
      d={`M ${X(cx - headRx * 0.5)} ${capTopY + 4} Q ${X(cx - headRx * 0.1)} ${capTopY - 2} ${X(cx + headRx * 0.35)} ${capTopY + 6}`}
      stroke={light}
      strokeWidth={5}
      fill="none"
      opacity={0.55}
      strokeLinecap="round"
    />,
  ];

  // texture bumps on the cap edge
  if (texture === 'curly' || texture === 'coily') {
    const bumps: React.ReactNode[] = [];
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.08 + (i / 8) * 0.84);
      const bx = X(cx + Math.cos(a + Math.PI) * -headRx * 1.0);
      // place bumps along the cap arc
      const t = i / 8;
      const px = X(cx - headRx * 1.02 + t * headRx * 2.04);
      const py = capTopY + Math.sin(t * Math.PI) * -2 + 2;
      void bx;
      bumps.push(<circle key={i} cx={px} cy={py} r={7} fill={color} />);
    }
    els.push(<g key="curls">{bumps}</g>);
  }

  // messy spikes
  if (style === 'messy') {
    let spikes = `M ${X(cx - headRx)} ${capTopY + 10} `;
    for (let i = 0; i <= 10; i++) {
      const px = X(cx - headRx + (i / 10) * headRx * 2);
      const py = capTopY + 10 - (i % 2 === 0 ? 14 : 4) - Math.sin((i / 10) * Math.PI) * 6;
      spikes += `L ${px.toFixed(1)} ${py.toFixed(1)} `;
    }
    spikes += `L ${X(cx + headRx)} ${capTopY + 10} Z`;
    els.push(<path key="spikes" d={spikes} fill={color} />);
  }

  // side panels (bob)
  if (plan.sideLen > 0) {
    for (const s of [-1, 1]) {
      const sx = X(cx + s * headRx * 0.98);
      const bottomY = templeY + plan.sideLen;
      els.push(
        <path
          key={`side-${s}`}
          d={`M ${sx} ${templeY} C ${sx + s * 8} ${templeY + plan.sideLen * 0.5} ${sx + s * 4} ${bottomY - 8} ${sx - s * 6} ${bottomY}
              L ${sx - s * 16} ${bottomY - 6} C ${sx - s * 10} ${templeY + plan.sideLen * 0.5} ${sx - s * 6} ${templeY + 10} ${sx - s * 4} ${templeY} Z`}
          fill={color}
        />,
      );
    }
  }

  // fade: shaved temples — skin wedges over the cap sides
  if (style === 'fade' || style === 'buzz') {
    els.push(
      <path
        key="fade-l"
        d={`M ${X(cx - headRx * 1.02)} ${templeY + 4} Q ${X(cx - headRx * 0.95)} ${templeY - 14} ${X(cx - headRx * 0.7)} ${capTopY + 12} L ${X(cx - headRx * 0.7)} ${templeY + 10} Z`}
        fill={color}
        opacity={0.35}
      />,
    );
    els.push(
      <path
        key="fade-r"
        d={`M ${X(cx + headRx * 1.02)} ${templeY + 4} Q ${X(cx + headRx * 0.95)} ${templeY - 14} ${X(cx + headRx * 0.7)} ${capTopY + 12} L ${X(cx + headRx * 0.7)} ${templeY + 10} Z`}
        fill={color}
        opacity={0.35}
      />,
    );
  }

  // bun / man-bun
  if (plan.extras.includes('bun') || plan.extras.includes('man-bun')) {
    const bx = X(cx + (plan.extras.includes('man-bun') ? 4 : 0));
    const by = capTopY - (plan.extras.includes('bun') ? 16 : 8);
    const br = plan.extras.includes('bun') ? 17 : 12;
    els.push(<circle key="bun" cx={bx} cy={by} r={br} fill={dark} />);
    els.push(<circle key="bun-hi" cx={bx - br * 0.3} cy={by - br * 0.3} r={br * 0.45} fill={color} />);
  }

  void chinY;
  return <g>{els}</g>;
}
