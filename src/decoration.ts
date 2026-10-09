// seed -> hash -> parameters -> bands of motifs -> svg path data
// Independent of the shape DNA: it only reads the finished geometry.

import { type Geometry, halfWidthAt, profile } from "./amphora";
import { MOTIF_LIST, MOTIF_NAMES, type Box } from "./motifs";
import { type Dna, choiceIndex, resolve } from "./params";
import { type Pt, poly } from "./svg";

// Motif parameters select a motif from the library (0..1 -> index); the others are plain quantities.
export const DECO_SPECS = {
  neckMotif: { label: "Neck motif", min: 0, max: 1, choices: MOTIF_NAMES },
  shoulderMotif: { label: "Shoulder motif", min: 0, max: 1, choices: MOTIF_NAMES },
  bodyMotif: { label: "Body motif", min: 0, max: 1, choices: MOTIF_NAMES },
  footMotif: { label: "Foot motif", min: 0, max: 1, choices: MOTIF_NAMES },
  density: { label: "Density (tiles per band height)", min: 0.6, max: 2.4 },
  bandHeight: { label: "Band height", min: 8, max: 26 },
  lineWeight: { label: "Line weight", min: 0.8, max: 2.4 },
  ruleCount: { label: "Rules between bands", min: 0, max: 2 },
  vineAngle: { label: "Vine angle (degrees)", min: 12, max: 45 },
  vineDepth: { label: "Vine depth", min: 1, max: 3 },
  figureStyle: { label: "Style (below 0.5 red-figure, else black-figure)", min: 0, max: 1 },
} as const;

// Normalized values (0..1) for every decoration parameter.
export type DecoDna = Dna<typeof DECO_SPECS>;

export type Decoration = {
  ground: string; // colour of the vessel
  ink: string; // colour of the motifs
  fills: string; // path data to fill with ink
  lines: string; // path data to stroke with ink
  lineWidth: number;
};

const CLAY = "#c4673a";
const DARK = "#2b1a12";
const GAP = 7; // space between bands, where the rules go

// Widest half-width of the profile within a band.
function bandHalfWidth(pts: Pt[], y0: number, y1: number): number {
  let w = 0;
  for (let k = 0; k <= 4; k++) w = Math.max(w, halfWidthAt(pts, y0 + ((y1 - y0) * k) / 4));
  return w;
}

// Thin horizontal bars evenly spaced between y0 and y1.
function rules(pts: Pt[], y0: number, y1: number, count: number, weight: number): string {
  let d = "";
  for (let k = 1; k <= count; k++) {
    const y = y0 + ((y1 - y0) * k) / (count + 1);
    const w = halfWidthAt(pts, y) * 1.1;
    const t = weight * 0.35;
    d += poly([[-w, y - t], [w, y - t], [w, y + t], [-w, y + t]], true);
  }
  return d;
}

export function decorate(g: Geometry, dna: DecoDna): Decoration {
  const v = resolve(DECO_SPECS, dna);
  const pts = profile(g);
  const t = v.bandHeight;

  // Bands from top to bottom: neck, shoulder, body, foot.
  const neckY0 = g.lipH + 3;
  const shoulderY0 = g.neckHeight + 4;
  const shoulderY1 = shoulderY0 + t;
  const footY1 = g.yFoot - 2;
  const footY0 = footY1 - t * 0.8;
  const bands = [
    { y0: neckY0, y1: Math.min(neckY0 + t, g.neckHeight - 3), motif: v.neckMotif },
    { y0: shoulderY0, y1: shoulderY1, motif: v.shoulderMotif },
    { y0: shoulderY1 + GAP, y1: footY0 - GAP, motif: v.bodyMotif },
    { y0: footY0, y1: footY1, motif: v.footMotif },
  ];

  const opts = { angle: v.vineAngle, depth: Math.round(v.vineDepth) };
  let fills = "";
  let lines = "";
  bands.forEach((band, i) => {
    const h = band.y1 - band.y0;
    const w = bandHalfWidth(pts, band.y0, band.y1);
    const box: Box = { x0: -w, x1: w, y0: band.y0, y1: band.y1 };
    // Tile count follows the band width, so tile proportions stay stable on narrow bands.
    const n = Math.max(1, Math.round(((2 * w) / h) * v.density));
    const motif = MOTIF_LIST[choiceIndex(band.motif, MOTIF_LIST.length)];
    const shape = motif(box, n, opts);
    fills += shape.fill;
    lines += shape.line;
    const next = bands[i + 1];
    if (next) fills += rules(pts, band.y1, next.y0, Math.round(v.ruleCount), v.lineWeight);
  });

  const blackFigure = v.figureStyle >= 0.5;
  return {
    ground: blackFigure ? CLAY : DARK,
    ink: blackFigure ? DARK : CLAY,
    fills,
    lines,
    lineWidth: v.lineWeight,
  };
}
