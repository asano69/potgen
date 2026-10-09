// Minimal L-system: string rewriting plus a turtle interpreter. Both are pure.

export type Rules = Record<string, string>;

// Rewrites every symbol of the axiom in parallel, depth times.
export function expand(axiom: string, rules: Rules, depth: number): string {
  let s = axiom;
  for (let i = 0; i < depth; i++) {
    s = [...s].map((c) => rules[c] ?? c).join("");
  }
  return s;
}

// A line segment [x0, y0, x1, y1] in turtle units.
export type Seg = [number, number, number, number];

// Interprets F (draw one unit forward), + / - (turn left / right), [ ] (push / pop state).
// The turtle starts at the origin heading up; y grows upward in the result.
export function turtle(s: string, angleDeg: number): Seg[] {
  const segs: Seg[] = [];
  const stack: [number, number, number][] = [];
  const turn = (angleDeg * Math.PI) / 180;
  let x = 0;
  let y = 0;
  let a = 0; // heading in radians, 0 = up
  for (const c of s) {
    if (c === "F") {
      const nx = x + Math.sin(a);
      const ny = y + Math.cos(a);
      segs.push([x, y, nx, ny]);
      x = nx;
      y = ny;
    } else if (c === "+") {
      a += turn;
    } else if (c === "-") {
      a -= turn;
    } else if (c === "[") {
      stack.push([x, y, a]);
    } else if (c === "]") {
      [x, y, a] = stack.pop()!;
    }
  }
  return segs;
}
