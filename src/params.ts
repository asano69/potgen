// Parameter handling shared by shape and decoration:
// seed -> hash -> rng -> normalized values (DNA) -> values in drawing units.

// A parameter is normalized to 0..1 and mapped to [min, max].
// choices, if given, names the options a 0..1 value selects between (see choiceIndex).
export type Spec = { label: string; min: number; max: number; choices?: readonly string[] };
export type Specs = Record<string, Spec>;

// Normalized values (0..1) for every parameter of a spec set.
export type Dna<S extends Specs> = Record<keyof S, number>;

export function keysOf<S extends Specs>(specs: S): (keyof S & string)[] {
  return Object.keys(specs) as (keyof S & string)[];
}

export function defaultDna<S extends Specs>(specs: S): Dna<S> {
  return Object.fromEntries(keysOf(specs).map((k) => [k, 0.5])) as Dna<S>;
}

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
// Different seed strings give independent DNAs, so shape and decoration use different salts.
export function makeDna<S extends Specs>(
  specs: S,
  seed: string,
  means: Dna<S>,
  variation: number,
): Dna<S> {
  const rand = rng(hash(seed));
  const dna = {} as Dna<S>;
  for (const k of keysOf(specs)) {
    const v = means[k] + (rand() - 0.5) * variation;
    dna[k] = Math.min(1, Math.max(0, v));
  }
  return dna;
}

// Maps normalized DNA values to [min, max] in drawing units.
export function resolve<S extends Specs>(specs: S, dna: Dna<S>): Dna<S> {
  const out = {} as Dna<S>;
  for (const k of keysOf(specs)) {
    const { min, max } = specs[k];
    out[k] = min + (max - min) * dna[k];
  }
  return out;
}

// Maps a value in 0..1 to an option index in 0..n-1.
export function choiceIndex(v: number, n: number): number {
  return Math.min(n - 1, Math.floor(v * n));
}
