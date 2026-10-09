// seed -> hash -> parameters -> bezier curve -> svg

// Each parameter is normalized to 0..1 and mapped to [min, max] in drawing units.
export const PARAM_SPECS = {
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

export type ParamKey = keyof typeof PARAM_SPECS;
export const PARAM_KEYS = Object.keys(PARAM_SPECS) as ParamKey[];

// Normalized values (0..1) for every parameter.
export type Dna = Record<ParamKey, number>;

// FNV-1a string hash.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG.
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sample a DNA around the given means. variation is 0..1.
export function makeDna(seed: string, means: Dna, variation: number): Dna {
  const rand = rng(hash(seed));
  const dna = {} as Dna;
  for (const k of PARAM_KEYS) {
    const v = means[k] + (rand() - 0.5) * variation;
    dna[k] = Math.min(1, Math.max(0, v));
  }
  return dna;
}

type Pt = [number, number];

function value(dna: Dna, k: ParamKey): number {
  const { min, max } = PARAM_SPECS[k];
  return min + (max - min) * dna[k];
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

function f(n: number): string {
  return n.toFixed(1);
}

// Returns SVG path data (body outline and handles) for the DNA. y grows downward.
export function amphoraPaths(dna: Dna): { body: string; handles: string } {
  const neckH = value(dna, "neckHeight");
  const neckW = value(dna, "neckWidth");
  const lipW = value(dna, "lipWidth");
  const bodyW = value(dna, "bodyWidth");
  const bodyH = value(dna, "bodyHeight");
  const belly = value(dna, "bellyPos");
  const footW = value(dna, "footWidth");
  const footH = value(dna, "footHeight");
  const handle = value(dna, "handleSize");

  const lipH = neckH * 0.15;
  const yBelly = neckH + bodyH * belly;
  const yFoot = neckH + bodyH;
  const yBottom = yFoot + footH;

  // Right half of the profile, from lip to base.
  const right: Pt[] = [
    [lipW, 0],
    [neckW, lipH],
    [neckW, neckH],
    [bodyW, yBelly],
    [footW, yFoot],
    [footW, yBottom],
  ];
  // Left half is the mirror image, walked from base back up to the lip.
  const left: Pt[] = right.map(([x, y]): Pt => [-x, y]).reverse();

  const body =
    `M${f(right[0][0])},${f(right[0][1])}` +
    smooth(right) +
    ` L${f(left[0][0])},${f(left[0][1])}` +
    smooth(left) +
    " Z";

  // Loop handles from the neck down to the shoulder, on both sides.
  const yTop = neckH * 0.35;
  const yJoin = neckH + bodyH * belly * 0.35;
  const xJoin = (neckW + bodyW) / 2;
  const side = (s: number) =>
    `M${f(s * neckW)},${f(yTop)} C${f(s * (neckW + handle))},${f(yTop - handle * 0.3)} ` +
    `${f(s * (xJoin + handle))},${f(yJoin - handle)} ${f(s * xJoin)},${f(yJoin)}`;

  return { body, handles: side(1) + " " + side(-1) };
}
