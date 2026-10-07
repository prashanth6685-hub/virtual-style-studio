import type { AvatarConfig, BodyBuild, FaceShape } from './types';

/**
 * Parametric body landmarks — fashion-illustration proportions (~7.5 heads tall
 * for adults, ~6.5 for kids). All units are SVG px in a 320×640 viewBox, cx=160.
 */
export interface BodyGeom {
  cx: number;
  /** head */
  headCy: number;
  headTopY: number;
  headRx: number;
  headRy: number;
  chinY: number;
  foreheadHW: number;
  cheekHW: number;
  jawHW: number;
  /** neck + trapezius */
  neckTopY: number;
  neckBotY: number;
  neckHW: number;
  /** torso */
  shoulderY: number;
  shoulderHW: number;
  chestY: number;
  chestHW: number;
  bustY: number;
  bustHW: number;
  waistY: number;
  waistHW: number;
  hipY: number;
  hipHW: number;
  crotchY: number;
  torsoBotY: number;
  /** legs */
  thighHW: number;
  kneeY: number;
  kneeHW: number;
  calfY: number;
  calfHW: number;
  ankleY: number;
  ankleHW: number;
  footY: number;
  footLen: number;
  /** arms */
  armTopY: number;
  elbowY: number;
  elbowOut: number;
  wristY: number;
  deltHW: number;
  upperArmHW: number;
  elbowHW: number;
  wristHW: number;
  handLen: number;
  handHW: number;
  /** flags */
  heightScale: number;
  isKid: boolean;
  isFeminine: boolean;
  build: BodyBuild;
}

const BUILD_HW: Record<BodyBuild, { shoulder: number; chest: number; waist: number; hip: number }> = {
  slim: { shoulder: 46, chest: 41, waist: 33, hip: 42 },
  athletic: { shoulder: 56, chest: 50, waist: 38, hip: 44 },
  average: { shoulder: 51, chest: 45, waist: 38, hip: 45 },
  curvy: { shoulder: 50, chest: 48, waist: 36, hip: 53 },
  plus: { shoulder: 58, chest: 55, waist: 52, hip: 60 },
};

const FACE_HEAD: Record<FaceShape, { rx: number; ry: number; forehead: number; cheek: number; jaw: number }> = {
  oval: { rx: 31, ry: 40, forehead: 29, cheek: 31, jaw: 24 },
  round: { rx: 34, ry: 38, forehead: 31, cheek: 34, jaw: 28 },
  square: { rx: 32, ry: 40, forehead: 30, cheek: 31, jaw: 29 },
  heart: { rx: 33, ry: 40, forehead: 32, cheek: 29, jaw: 21 },
  diamond: { rx: 30, ry: 41, forehead: 27, cheek: 33, jaw: 22 },
  oblong: { rx: 30, ry: 44, forehead: 29, cheek: 30, jaw: 25 },
};

function sliderAdjust(base: number, slider: number, range: number): number {
  return base * (1 + (slider - 0.5) * 2 * range);
}

export function computeGeometry(config: AvatarConfig): BodyGeom {
  const { body, face, ageGroup, personType } = config;
  const isKid = personType === 'boy' || personType === 'girl';
  const isFeminine = personType === 'woman' || personType === 'girl';
  const cx = 160;

  const hw = BUILD_HW[body.build];
  const shoulderHW = sliderAdjust(hw.shoulder, body.shoulder, 0.16) * (isFeminine ? 0.94 : 1);
  const chestHW = sliderAdjust(hw.chest, body.shoulder, 0.12) * (isFeminine ? 0.96 : 1);
  const waistHW = sliderAdjust(hw.waist, body.waist, 0.2) * (isFeminine ? 0.92 : 1);
  const hipHW = sliderAdjust(hw.hip, body.hips, 0.2) * (isFeminine ? 1.06 : 1);

  // ---- head ----
  const kidHead = isKid ? 1.16 : 1;
  const fh = FACE_HEAD[face.shape];
  const headRx = fh.rx * kidHead;
  const headRy = fh.ry * kidHead;
  const headCy = (isKid ? 70 : 64);
  const headTopY = headCy - headRy;
  const chinY = headCy + headRy * 0.99;

  // ---- vertical layout ----
  // Height slider lengthens the legs; head + torso stay fixed (classic croquis).
  const heightScale = 0.9 + body.height * 0.2;
  let shoulderY: number, chestY: number, waistY: number, hipY: number, crotchY: number;
  let kneeY: number, ankleY: number, footY: number;
  let elbowY: number, wristY: number;
  if (isKid) {
    shoulderY = 152; chestY = 192; waistY = 240; hipY = 286; crotchY = 320;
    kneeY = 410; ankleY = 492; footY = 510;
    elbowY = 252; wristY = 322;
  } else {
    shoulderY = 148; chestY = 196; waistY = 248; hipY = 296; crotchY = 340;
    const legTop = crotchY;
    const legLen = 232 * heightScale; // crotch → ankle
    kneeY = legTop + legLen * 0.47;
    ankleY = legTop + legLen;
    footY = ankleY + 18;
    elbowY = 282; wristY = 372;
  }
  const bustY = chestY + 10;
  const bustHW = chestHW * (isFeminine ? 1.04 : 1);
  const torsoBotY = crotchY + 26;
  const calfY = kneeY + (ankleY - kneeY) * 0.32;

  const neckTopY = chinY - 8;
  const neckBotY = shoulderY - 8;
  const neckHW = (isKid ? 11 : 14) * (isFeminine ? 0.95 : 1);

  const thighHW = hipHW * (isFeminine ? 0.60 : 0.64);
  const upperArmHW = 12 + (body.build === 'plus' ? 4 : body.build === 'athletic' ? 2.5 : 0);

  return {
    cx,
    headCy, headTopY, headRx, headRy, chinY,
    foreheadHW: fh.forehead * kidHead,
    cheekHW: fh.cheek * kidHead,
    jawHW: fh.jaw * kidHead,
    neckTopY, neckBotY, neckHW,
    shoulderY, shoulderHW,
    chestY, chestHW,
    bustY, bustHW,
    waistY, waistHW,
    hipY, hipHW,
    crotchY, torsoBotY,
    thighHW,
    kneeY, kneeHW: 12.5,
    calfY, calfHW: 14.5,
    ankleY, ankleHW: 8.5,
    footY, footLen: 26,
    armTopY: shoulderY + 8,
    elbowY, elbowOut: 4,
    wristY,
    deltHW: 15,
    upperArmHW, elbowHW: 9, wristHW: 6.5,
    handLen: isKid ? 28 : 36, handHW: 8.5,
    heightScale,
    isKid,
    isFeminine,
    build: body.build,
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

function mirror(pts: [number, number][], cx: number): [number, number][] {
  return pts.map(([x, y]) => [2 * cx - x, y] as [number, number]);
}

/**
 * Shaped head: forehead → temple → cheekbone → jaw → chin.
 * Far more natural than an ellipse; driven by the face-shape config.
 */
export function headPath(g: BodyGeom): string {
  const { cx, headCy, headTopY, foreheadHW, cheekHW, jawHW, chinY } = g;
  const topY = headTopY;
  const templeY = headCy - g.headRy * 0.45;
  const cheekY = headCy + g.headRy * 0.18;
  const jawY = headCy + g.headRy * 0.62;
  const right: [number, number][] = [
    [cx, topY],
    [cx + foreheadHW * 0.92, topY + 8],
    [cx + foreheadHW, templeY],
    [cx + cheekHW, cheekY],
    [cx + jawHW, jawY],
    [cx + jawHW * 0.45, chinY - 3],
    [cx, chinY],
  ];
  const left = mirror(right, cx).reverse();
  return smoothPath([...right, ...left.slice(1)], true);
}

/**
 * Torso: neck base → trapezius slope → shoulder tip → deltoid cap (bulges
 * outward so the arm reads as growing out of the shoulder) → underarm →
 * chest → waist → hip → pelvis. Legs are drawn separately underneath.
 * The arm is drawn BEFORE the torso and tucks under the deltoid cap, so the
 * outer contour trapezius → deltoid → upper arm is one continuous curve.
 */
export function torsoPath(g: BodyGeom): string {
  const { cx } = g;
  const right: [number, number][] = [
    [cx + g.neckHW + 2, g.neckBotY - 2],
    [cx + g.neckHW + 14, g.neckBotY + 6], // trapezius: smooth descent from neck to shoulder
    [cx + g.shoulderHW - 2, g.shoulderY], // shoulder tip
    [cx + g.shoulderHW + 13, g.shoulderY + 16], // deltoid cap: outward bulge
    [cx + g.shoulderHW + 7, g.shoulderY + 38], // deltoid lower
    [cx + g.chestHW - 3, g.chestY + 34], // underarm
    [cx + g.bustHW, g.bustY + 14],
    [cx + g.waistHW, g.waistY],
    [cx + g.hipHW, g.hipY],
    [cx + g.hipHW * 0.92, g.crotchY + 10],
    [cx + 16, g.torsoBotY],
    [cx + 7, g.crotchY + 16],
    [cx, g.crotchY + 12],
  ];
  const left = mirror(right, cx).reverse();
  // top edge across the trapezius base (neck drawn over it)
  const top: [number, number][] = [
    [cx - g.neckHW - 2, g.neckBotY - 2],
    [cx, g.neckBotY + 5],
    [cx + g.neckHW + 2, g.neckBotY - 2],
  ];
  return smoothPath([...top, ...right.slice(1), ...left.slice(1)], true);
}

/** One leg: thigh → knee → calf → ankle. Built as center+radius stations
 *  so the leg has real mass (the old inner edge hugged the outer edge). */
export function legPath(g: BodyGeom, side: -1 | 1): string {
  const { cx } = g;
  const s = side;
  // [y, centerOffset, radius]
  const stations: [number, number, number][] = [
    [g.hipY + 4, 17, 15],
    [g.hipY + (g.kneeY - g.hipY) * 0.45, 15, 14],
    [g.kneeY, 9, 8],
    [g.calfY, 8, 10],
    [g.ankleY, 4.5, 6.5],
  ];
  const outer: [number, number][] = stations.map(([y, c, r]): [number, number] => [cx + s * (c + r), y]);
  const inner: [number, number][] = stations.map(([y, c, r]): [number, number] => [cx + s * Math.max(1.5, c - r), y]).reverse();
  return smoothPath([...outer, ...inner], true);
}

/** Simple forward foot, shoe-friendly. */
export function footPath(g: BodyGeom, side: -1 | 1): string {
  const { cx } = g;
  const s = side;
  const ax = cx + s * 2; // ankles sit near center; feet angle slightly outward
  const pts: [number, number][] = [
    [ax - g.ankleHW - 1, g.ankleY - 2],
    [ax + g.ankleHW + 1, g.ankleY - 2],
    [ax + s * 4 + 7, g.ankleY + 8],
    [ax + s * 5 + 8, g.footY - 4],
    [ax + s * 3, g.footY],
    [ax - s * 3 - 6, g.footY],
    [ax - 7, g.footY - 5],
    [ax - g.ankleHW, g.ankleY + 6],
  ];
  return smoothPath(pts, true);
}

/**
 * Shared arm centerline joints. The arm angles ~5° outward from the shoulder:
 * elbow sits slightly out, wrist further out. Garments (sleeves, watch) use
 * these so everything tracks the same arm.
 */
export interface ArmJoints {
  s: -1 | 1;
  j0x: number; j0y: number; // shoulder joint (deltoid center)
  j1x: number; j1y: number; // elbow
  j2x: number; j2y: number; // wrist
}

export function armJoints(g: BodyGeom, side: -1 | 1): ArmJoints {
  const s = side;
  return {
    s,
    j0x: g.cx + s * (g.shoulderHW - 8), j0y: g.shoulderY + 2,
    j1x: g.cx + s * (g.shoulderHW + 3), j1y: g.elbowY,
    j2x: g.cx + s * (g.shoulderHW + 11), j2y: g.wristY,
  };
}

/** Wrist center x for a side (follows the outward-angled arm). */
export function wristX(g: BodyGeom, side: -1 | 1): number {
  return g.cx + side * (g.shoulderHW + 11);
}

/**
 * Arm: deltoid dome tucked UNDER the torso's deltoid cap (drawn BEFORE the
 * torso, so the top 6px+ of the joint is always overlapped — no background
 * can show between arm and torso) → tapered upper arm → defined elbow →
 * slimmer forearm → wrist. The visible arm emerges from the torso's deltoid
 * cap, so the outer contour is one continuous curve.
 */
export function armPath(g: BodyGeom, side: -1 | 1): string {
  const j = armJoints(g, side);
  const s = j.s;
  const dW = g.deltHW;
  const uW = g.upperArmHW;
  const eW = g.elbowHW;
  const fW = 8;
  const wW = g.wristHW;
  const outer: [number, number][] = [
    [j.j0x - s * 6, j.j0y + 4], // dome apex: tucked deep inside the torso
    [j.j0x + s * (dW - 4), j.j0y + 12], // deltoid outer: under the torso's cap
    [j.j0x + s * (uW + 1), (j.j0y + j.j1y) / 2], // upper-arm outer (emerges)
    [j.j1x + s * eW, j.j1y], // elbow outer
    [j.j1x + s * (fW + 0.5), (j.j1y + j.j2y) / 2], // forearm outer
    [j.j2x + s * wW, j.j2y], // wrist outer
  ];
  const inner: [number, number][] = [
    [j.j2x - s * wW, j.j2y], // wrist inner
    [j.j1x - s * fW * 0.9, (j.j1y + j.j2y) / 2], // forearm inner
    [j.j1x - s * eW * 0.85, j.j1y], // elbow inner
    [j.j0x - s * uW * 0.85, (j.j0y + j.j1y) / 2], // upper-arm inner
    [j.j0x - s * dW * 0.7, j.j0y + 10], // armpit (tucks under torso)
  ];
  return smoothPath([...outer, ...inner], true);
}

/**
 * Hand: palm with four rounded fingers (separation valleys) and a distinct
 * thumb on the inner side. Sized to read as a real hand, not a nub.
 */
export function handPath(g: BodyGeom, side: -1 | 1): string {
  const s = side;
  const wx = wristX(g, side);
  const wy = g.wristY - 2;
  const L = g.handLen;
  const w = g.handHW;
  const X = (dx: number) => (wx + s * dx).toFixed(1);
  const Y = (t: number) => (wy + L * t).toFixed(1);
  const d = [
    `M ${X(w)} ${Y(0)}`, // outer wrist
    `L ${X(w + 0.8)} ${Y(0.52)}`, // outer palm
    // four fingers: tip → valley → tip …
    `Q ${X(w - 0.5)} ${Y(0.86)}, ${X(6)} ${Y(0.88)}`, // pinky tip
    `Q ${X(4.6)} ${Y(0.9)}, ${X(4)} ${Y(0.84)}`, // valley
    `Q ${X(3.2)} ${Y(0.92)}, ${X(2)} ${Y(0.95)}`, // ring tip
    `Q ${X(0.8)} ${Y(0.97)}, ${X(0)} ${Y(0.9)}`, // valley
    `Q ${X(-1.2)} ${Y(0.98)}, ${X(-2)} ${Y(0.99)}`, // middle tip
    `Q ${X(-3.2)} ${Y(1)}, ${X(-4)} ${Y(0.92)}`, // valley
    `Q ${X(-5)} ${Y(0.96)}, ${X(-6)} ${Y(0.9)}`, // index tip
    `Q ${X(-7)} ${Y(0.88)}, ${X(-(w - 1.5))} ${Y(0.8)}`, // index round → inner palm
    `L ${X(-(w - 1))} ${Y(0.6)}`, // inner edge up
    // thumb: protrudes inward, tip at ~45% of hand length
    `C ${X(-(w + 3))} ${Y(0.56)}, ${X(-(w + 5))} ${Y(0.48)}, ${X(-(w + 4))} ${Y(0.4)}`,
    `C ${X(-(w + 3))} ${Y(0.34)}, ${X(-(w - 1))} ${Y(0.32)}, ${X(-(w - 2))} ${Y(0.22)}`,
    `L ${X(-w)} ${Y(0.1)}`,
    'Z',
  ].join(' ');
  return d;
}

/**
 * Legacy full silhouette (kept for compatibility): torso + legs as one path.
 * The renderer now uses torsoPath/legPath separately for better anatomy.
 */
export function bodySilhouettePath(g: BodyGeom): string {
  return torsoPath(g);
}
