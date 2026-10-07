/**
 * Seeded pseudo-random numbers.
 *
 * Cards are generated from a short seed that lives in the URL, so the same seed
 * always lays out the same card. Math.random can't do that, hence xmur3 to turn
 * a seed string into a 32-bit state and mulberry32 to draw from it.
 */

/**
 * Hash a seed string down to a 32-bit integer state.
 *
 * @param {string} str
 * @returns {number}
 */
export function hashSeed(str) {
  let h = 1779033703 ^ String(str).length;

  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * Build a generator of floats in [0, 1) from a 32-bit state.
 *
 * @param {number} state
 * @returns {() => number}
 */
export function mulberry32(state) {
  let a = state >>> 0;

  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The random source for a given seed.
 *
 * @param {string} seed
 * @returns {() => number}
 */
export function makeRng(seed) {
  return mulberry32(hashSeed(seed));
}

/**
 * A fresh short seed, lowercase base36 — short enough to live in a URL without
 * looking like a tracking parameter.
 *
 * @returns {string}
 */
export function randomSeed() {
  const bytes = new Uint32Array(2);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 0xffffffff);
    bytes[1] = Math.floor(Math.random() * 0xffffffff);
  }

  return (bytes[0].toString(36) + bytes[1].toString(36)).slice(0, 8);
}
