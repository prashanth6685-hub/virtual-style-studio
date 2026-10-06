import type { AvatarConfig, BodyBuild, FaceShape } from './types';

/** Parametric body landmarks. All units are SVG px in a 320×640 viewBox. */
export interface BodyGeom {
  cx: number;
  /** head */
  headCy: number;
  headRx: number;
  headRy: number;
  chinY: number;
  /** neck */
  neckTopY: number;
  neckBotY: number;
  neckHW: number;
  /** torso */
  shoulderY: number;
  shoulderHW: number;
  chestY: number;
  chestHW: number;
  waistY: number;
  waistHW: number;
  hipY: number;
  hipHW: number;
  /** legs */
  crotchY: number;
  kneeY: number;
  ankleY: number;
  footY: number;
  legHW: number; // thigh half-width
  /** arms */
  wristY: number;
  armHW: number; // upper-arm half-width
  handR: number;
  /** global */
  heightScale: number;
  isKid: boolean;
}

const BUILD_HW: Record<BodyBuild, { shoulder: number; chest: number; waist: number; hip: number }> = {
  slim: { shoulder: 40, chest: 38, waist: 32, hip: 36 },
  athletic: { shoulder: 51, chest: 49, waist: 38, hip: 41 },
  average: { shoulder: 45, chest: 43, waist: 38, hip: 43 },
  curvy: { shoulder: 45, chest: 48, waist: 37, hip: 53 },
  plus: { shoulder: 55, chest: 57, waist: 54, hip: 60 },
};

const FACE_HEAD: Record<FaceShape, { rx: number; ry: number }> = {
  oval: { rx: 33, ry: 41 },
  round: { rx: 37, ry: 38 },
  square: { rx: 35, ry: 40 },
  heart: { rx: 36, ry: 41 },
  diamond: { rx: 32, ry: 42 },
  oblong: { rx: 31, ry: 45 },
};

function sliderAdjust(base: number, slider: number, range: number): number {
  return base * (1 + (slider - 0.5) * 2 * range);
}

export function computeGeometry(config: AvatarConfig): BodyGeom {
  const { body, face, ageGroup, personType } = config;
  const isKid = personType === 'boy' || personType === 'girl';
  const cx = 160;

  const hw = BUILD_HW[body.build];
  const shoulderHW = sliderAdjust(hw.shoulder, body.shoulder, 0.18);
  const chestHW = sliderAdjust(hw.chest, body.shoulder, 0.12);
  const waistHW = sliderAdjust(hw.waist, body.waist, 0.22);
  const hipHW = sliderAdjust(hw.hip, body.hips, 0.22);

  // Height slider mostly lengthens the legs.
  const heightScale = 0.9 + body.height * 0.2;
  const legLen = 172 * heightScale; // crotch → ankle
  const crotchY = 404;
  const kneeY = crotchY + legLen * 0.48;
  const ankleY = crotchY + legLen;
  const footY = ankleY + 16;

  const headScale = ageGroup === 'child' ? 1.14 : ageGroup === 'teen' ? 1.06 : 1;
  const fh = FACE_HEAD[face.shape];
  const headRx = fh.rx * headScale;
  const headRy = fh.ry * headScale;
  const headCy = 96 * headScale - 4;
  const chinY = headCy + headRy * 0.98;

  const neckTopY = chinY - 6;
  const neckBotY = 168;
  const neckHW = 13 * (isKid ? 0.85 : 1);

  return {
    cx,
    headCy,
    headRx,
    headRy,
    chinY,
    neckTopY,
    neckBotY,
    neckHW,
    shoulderY: 172,
    shoulderHW,
    chestY: 240,
    chestHW,
    waistY: 308,
    waistHW,
    hipY: 368,
    hipHW,
    crotchY,
    kneeY,
    ankleY,
    footY,
    legHW: hipHW * 0.44,
    wristY: 396,
    armHW: 13 + (body.build === 'plus' ? 4 : body.build === 'athletic' ? 2 : 0),
    handR: 11,
    heightScale,
    isKid,
  };
}

/** Catmull-Rom → cubic Bézier smoothing for landmark polylines. */
export function smoothPath(pts: [number, number][], close = false): string {
  if (pts.length < 2) return '';
  const p = pts.slice();
  if (close) p.push(pts[0], pts[1]);
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  if (close) d += ' Z';
  return d;
}

/** Full skin silhouette: torso + legs as one smooth path (arms drawn separately). */
export function bodySilhouettePath(g: BodyGeom): string {
  const { cx } = g;
  // left outer → left foot → up left inner leg → crotch → down right inner leg
  // → right foot → right outer → shoulders → close across the top
  const full: [number, number][] = [
    [cx - g.shoulderHW, g.shoulderY],
    [cx - g.chestHW, g.chestY],
    [cx - g.waistHW, g.waistY],
    [cx - g.hipHW, g.hipY],
    [cx - g.legHW - 2, g.crotchY + 14],
    [cx - g.legHW * 0.72, g.kneeY],
    [cx - 10, g.ankleY],
    [cx - 13, g.footY - 1],
    [cx - 3, g.footY],
    [cx - 6, g.kneeY],
    [cx - 5, g.crotchY + 4],
    [cx, g.crotchY],
    [cx + 5, g.crotchY + 4],
    [cx + 6, g.kneeY],
    [cx + 3, g.footY],
    [cx + 13, g.footY - 1],
    [cx + 10, g.ankleY],
    [cx + g.legHW * 0.72, g.kneeY],
    [cx + g.legHW + 2, g.crotchY + 14],
    [cx + g.hipHW, g.hipY],
    [cx + g.waistHW, g.waistY],
    [cx + g.chestHW, g.chestY],
    [cx + g.shoulderHW, g.shoulderY],
  ];
  const top: [number, number][] = [
    [cx - g.shoulderHW, g.shoulderY],
    [cx - g.shoulderHW * 0.4, g.shoulderY - 8],
    [cx + g.shoulderHW * 0.4, g.shoulderY - 8],
    [cx + g.shoulderHW, g.shoulderY],
  ];
  return smoothPath([...full, ...top.slice(1)], true);
}

/** Arm path (one side). side = -1 left, +1 right. */
export function armPath(g: BodyGeom, side: -1 | 1): string {
  const { cx } = g;
  const topX = cx + side * (g.shoulderHW - 2);
  const topY = g.shoulderY + 6;
  const wristX = cx + side * (g.shoulderHW - 9);
  const wristY = g.wristY;
  const w = g.armHW;
  const pts: [number, number][] = [
    [topX - w, topY],
    [wristX - w * 0.8, wristY],
    [wristX + w * 0.8, wristY],
    [topX + w, topY],
  ];
  return smoothPath(pts, true);
}
