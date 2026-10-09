// seed -> hash -> parameters -> bezier curve -> svg

import { type Dna, resolve } from "./params";
import { type Pt, f } from "./svg";

// Each parameter is normalized to 0..1 and mapped to [min, max] in drawing units.
export const SHAPE_SPECS = {
  neckHeight: { label: "Neck height", min: 20, max: 90 },
  neckWidth: { label: "Neck half-width", min: 10, max: 35 },
  lipWidth: { label: "Lip half-width", min: 12, max: 45 },
  bodyWidth: { label: "Body half-width", min: 30, max: 80 },
  bodyHeight: { label: "Body height", min: 80, max: 200 },
  bellyPos: { label: "Belly position (0=top, 1=bottom)", min: 0.2, max: 0.8 },
  footWidth: { label: "Foot half-width", min: 8, max: 35 },
  footHeight: { label: "Foot height", min: 5, max: 40 },
  handleSize: { label: "Handle size", min: 8, max: 28 },
} as const;

// Normalized values (0..1) for every shape parameter.
export type ShapeDna = Dna<typeof SHAPE_SPECS>;

// Resolved parameters plus the derived heights shared by the outline and the decoration.
export function geometry(dna: ShapeDna) {
  const v = resolve(SHAPE_SPECS, dna);
  const yFoot = v.neckHeight + v.bodyHeight;
  return {
    ...v,
    lipH: v.neckHeight * 0.15,
    yBelly: v.neckHeight + v.bodyHeight * v.bellyPos,
    yFoot,
    yBottom: yFoot + v.footHeight,
  };
}
export type Geometry = ReturnType<typeof geometry>;

// Right half of the profile, from lip to base.
export function profile(g: Geometry): Pt[] {
  return [
    [g.lipWidth, 0],
    [g.neckWidth, g.lipH],
    [g.neckWidth, g.neckHeight],
    [g.bodyWidth, g.yBelly],
    [g.footWidth, g.yFoot],
    [g.footWidth, g.yBottom],
  ];
}

// Half-width at height y, interpolated linearly between the profile points.
// The real outline is a smooth curve, so this is only an estimate (decoration is clipped to the outline).
export function halfWidthAt(pts: Pt[], y: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (y >= y0 && y <= y1) return y1 === y0 ? Math.max(x0, x1) : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

// Catmull-Rom spline through pts, emitted as cubic bezier segments (no initial M).
function smooth(pts: Pt[]): string {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

// Returns SVG path data (body outline and handles) for the geometry. y grows downward.
export function amphoraPaths(g: Geometry): { body: string; handles: string } {
  const right = profile(g);
  // Left half is the mirror image, walked from base back up to the lip.
  const left: Pt[] = right.map(([x, y]): Pt => [-x, y]).reverse();

  const body =
    `M${f(right[0][0])},${f(right[0][1])}` +
    smooth(right) +
    ` L${f(left[0][0])},${f(left[0][1])}` +
    smooth(left) +
    " Z";

  // Loop handles from the neck down to the shoulder, on both sides.
  const neckW = g.neckWidth;
  const handle = g.handleSize;
  const yTop = g.neckHeight * 0.35;
  const yJoin = g.neckHeight + g.bodyHeight * g.bellyPos * 0.35;
  const xJoin = (neckW + g.bodyWidth) / 2;
  const side = (s: number) =>
    `M${f(s * neckW)},${f(yTop)} C${f(s * (neckW + handle))},${f(yTop - handle * 0.3)} ` +
    `${f(s * (xJoin + handle))},${f(yJoin - handle)} ${f(s * xJoin)},${f(yJoin)}`;

  return { body, handles: side(1) + " " + side(-1) };
}
