/**
 * Seeded random number generator using mulberry32 algorithm.
 * Produces deterministic sequences for session-stable randomization.
 */

export function createSeededRandom(seed: number): () => number {
  let state = seed;

  // Mulberry32 PRNG - fast and high quality
  return function random(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random integer in range [min, max] inclusive
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Generate a random float in range [min, max]
 */
export function randomFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/**
 * Pick a random element from an array
 */
export function randomPick<T>(rng: () => number, array: T[]): T {
  return array[Math.floor(rng() * array.length)];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function randomShuffle<T>(rng: () => number, array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a fresh seed on each page load using high-resolution timestamp
 * This ensures different traces on each refresh
 */
export function getPageLoadSeed(): number {
  if (typeof window === 'undefined') return Date.now();

  // Use performance.now() for higher precision + Date.now() for uniqueness
  // This will be different on each page load
  return Math.floor(performance.now() * 1000) ^ Date.now();
}
