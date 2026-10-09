// Motif library. Each motif is a pure function that fills a rectangular band with n tiles.
// Coordinates are SVG coordinates (y grows downward).

import { expand, turtle } from "./lsystem";
import { type Pt, circle, p, poly } from "./svg";

export type Box = { x0: number; x1: number; y0: number; y1: number };
// fill is drawn as filled path data, line as stroked path data.
export type Shape = { fill: string; line: string };
export type MotifOpts = { angle: number; depth: number };
export type Motif = (b: Box, n: number, o: MotifOpts) => Shape;

// Concatenates the path data drawn by draw() for each of n equal-width tiles.
function tiles(b: Box, n: number, draw: (x: number, w: number, i: number) => string): string {
  const w = (b.x1 - b.x0) / n;
  let d = "";
  for (let i = 0; i < n; i++) d += draw(b.x0 + i * w, w, i);
  return d;
}

// Greek key: a square spiral wound inwards, standing on a baseline.
const meander: Motif = (b, n) => {
  const h = b.y1 - b.y0;
  // Hook on a 4x4 grid, y up.
  const hook: Pt[] = [[0, 0], [0, 4], [4, 4], [4, 1], [1, 1], [1, 3], [3, 3], [3, 2], [2, 2]];
  const line = tiles(b, n, (x, w) => {
    const pts = hook.map(([gx, gy]): Pt => [x + (gx * w) / 5, b.y1 - (gy * h) / 4]);
    return poly(pts) + poly([[x, b.y1], [x + w, b.y1]]);
  });
  return { fill: "", line };
};

// Running wave: one sine-like period per tile (quadratic bezier, mirrored by T).
const wave: Motif = (b, n) => {
  const h = b.y1 - b.y0;
  const ym = (b.y0 + b.y1) / 2;
  const line = tiles(
    b,
    n,
    (x, w) => `M${p([x, ym])}Q${p([x + w / 4, ym - 0.8 * h])} ${p([x + w / 2, ym])}T${p([x + w, ym])}`,
  );
  return { fill: "", line };
};

// Row of upright triangles.
const triangle: Motif = (b, n) => ({
  fill: tiles(b, n, (x, w) => {
    const g = w * 0.1;
    return poly([[x + g, b.y1], [x + w / 2, b.y0], [x + w - g, b.y1]], true);
  }),
  line: "",
});

// Two stacked zigzags.
const chevron: Motif = (b, n) => {
  const h = b.y1 - b.y0;
  const line = tiles(b, n, (x, w) =>
    [0, 0.4]
      .map((d) => poly([[x, b.y0 + d * h], [x + w / 2, b.y0 + (d + 0.5) * h], [x + w, b.y0 + d * h]]))
      .join(""),
  );
  return { fill: "", line };
};

// Running spiral: Archimedean spirals joined by straight links.
const spiral: Motif = (b, n) => {
  const h = b.y1 - b.y0;
  const ym = (b.y0 + b.y1) / 2;
  const TURNS = 2;
  const STEPS = 24;
  const SHRINK = 0.85;
  const line = tiles(b, n, (x, w) => {
    const r0 = 0.45 * Math.min(w, h);
    const cx = x + w / 2;
    const pts: Pt[] = [];
    for (let k = 0; k <= STEPS; k++) {
      const t = k / STEPS;
      const a = Math.PI + 2 * Math.PI * TURNS * t;
      const r = r0 * (1 - SHRINK * t);
      pts.push([cx + r * Math.cos(a), ym + r * Math.sin(a)]);
    }
    // The spiral passes its right-hand side after half a turn; link that point to the next tile's start.
    const rHalf = r0 * (1 - SHRINK * (0.5 / TURNS));
    return poly(pts) + poly([[cx + rHalf, ym], [cx + w - r0, ym]]);
  });
  return { fill: "", line };
};

// Rosette: a ring, a centre dot and eight petal dots.
const rosette: Motif = (b, n) => {
  const h = b.y1 - b.y0;
  const ym = (b.y0 + b.y1) / 2;
  const radius = (w: number) => 0.45 * Math.min(w, h);
  const fill = tiles(b, n, (x, w) => {
    const cx = x + w / 2;
    const r = radius(w);
    let d = circle(cx, ym, r * 0.28);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      d += circle(cx + r * 0.72 * Math.cos(a), ym + r * 0.72 * Math.sin(a), r * 0.18);
    }
    return d;
  });
  const line = tiles(b, n, (x, w) => circle(x + w / 2, ym, radius(w)));
  return { fill, line };
};

// Leaf shape from (bx, by) pointing along angle a (radians, 0 = up). wid is the full width.
function petal(bx: number, by: number, a: number, len: number, wid: number): string {
  const tx = bx + len * Math.sin(a);
  const ty = by - len * Math.cos(a);
  const mx = (bx + tx) / 2;
  const my = (by + ty) / 2;
  const px = Math.cos(a) * wid;
  const py = Math.sin(a) * wid;
  return `M${p([bx, by])}Q${p([mx + px, my + py])} ${p([tx, ty])}Q${p([mx - px, my - py])} ${p([bx, by])}Z`;
}

// Fan of petals around the base point; outer petals are shorter. spread is the half-angle in radians.
function fan(cx: number, by: number, up: boolean, len: number, count: number, spread: number): string {
  let d = "";
  for (let k = 0; k < count; k++) {
    const t = (k / (count - 1)) * 2 - 1;
    const a = (up ? 0 : Math.PI) + t * spread;
    const l = len * (1 - 0.35 * Math.abs(t));
    d += petal(cx, by, a, l, l * 0.3);
  }
  return d;
}

// Upright palmette fans.
const palmette: Motif = (b, n) => {
  const h = b.y1 - b.y0;
  return {
    fill: tiles(b, n, (x, w) => fan(x + w / 2, b.y1, true, Math.min(h * 0.95, w * 0.8), 7, 1.2)),
    line: "",
  };
};

// Lotus buds (upright) alternating with palmettes (hanging).
const lotus: Motif = (b, n) => {
  const h = b.y1 - b.y0;
  return {
    fill: tiles(b, n, (x, w, i) => {
      const len = Math.min(h * 0.95, w * 0.8);
      return i % 2 === 0
        ? fan(x + w / 2, b.y1, true, len, 3, 0.55)
        : fan(x + w / 2, b.y0, false, len, 7, 1.1);
    }),
    line: "",
  };
};

// Vine: an L-system sprig per tile. depth and angle come from the options.
const vine: Motif = (b, n, o) => {
  const segs = turtle(expand("F", { F: "F[+F]F[-F]" }, o.depth), o.angle);
  // Bounding box of the sprig in turtle units.
  const xs = segs.flatMap(([x0, , x1]) => [x0, x1]);
  const ys = segs.flatMap(([, y0, , y1]) => [y0, y1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const h = b.y1 - b.y0;
  const line = tiles(b, n, (x, w) => {
    const s = Math.min((w * 0.9) / (maxX - minX || 1), (h * 0.95) / (maxY - minY || 1));
    const ox = x + w / 2 - ((minX + maxX) / 2) * s;
    return segs
      .map(([x0, y0, x1, y1]) =>
        poly([[ox + x0 * s, b.y1 - (y0 - minY) * s], [ox + x1 * s, b.y1 - (y1 - minY) * s]]),
      )
      .join("");
  });
  return { fill: "", line };
};

export const MOTIFS: Record<string, Motif> = {
  meander,
  wave,
  triangle,
  chevron,
  spiral,
  rosette,
  palmette,
  lotus,
  vine,
};
export const MOTIF_NAMES = Object.keys(MOTIFS);
export const MOTIF_LIST = Object.values(MOTIFS);
