/**
 * Deterministic pseudo-random source for portrait composition.
 *
 * Every face is a pure function of (race, gender, seed), so only the seed is
 * ever stored — four bytes instead of an image — and the same character looks
 * identical on every device, forever. That guarantee is only worth anything if
 * the generator is stable, so this is a fixed implementation (mulberry32) and
 * must not be swapped for Math.random or a library.
 */

export type Rng = {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Uniform pick from a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Weighted pick. Weights need not sum to 1. */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T;
};

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;

  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (entries) => {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
  };
}

/**
 * Derives a stable sub-generator from a seed and a label.
 *
 * Lets each facet of the face draw from its own stream, so adding a new
 * feature later does not shift every previously generated portrait. Without
 * this, inserting one extra `rng.next()` call would silently rewrite every
 * existing character's face.
 */
export function subSeed(seed: number, label: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function streamFor(seed: number, label: string): Rng {
  return mulberry32(subSeed(seed, label));
}

/** Seed for a brand-new character. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
