// Number formatting and small path-data helpers shared by shape and decoration.

export type Pt = [number, number];

export function f(n: number): string {
  return n.toFixed(1);
}

export function p([x, y]: Pt): string {
  return `${f(x)},${f(y)}`;
}

// Polyline path data through pts, optionally closed.
export function poly(pts: Pt[], close = false): string {
  return "M" + pts.map(p).join("L") + (close ? "Z" : "");
}

// Full circle path data (two arcs).
export function circle(cx: number, cy: number, r: number): string {
  return `M${p([cx - r, cy])}A${f(r)},${f(r)} 0 1,0 ${p([cx + r, cy])}A${f(r)},${f(r)} 0 1,0 ${p([cx - r, cy])}Z`;
}
