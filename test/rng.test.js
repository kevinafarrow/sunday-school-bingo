import { describe, it, expect } from 'vitest';
import { hashSeed, mulberry32, makeRng, randomSeed } from '../src/rng.js';

describe('hashSeed', () => {
  it('is deterministic', () => {
    expect(hashSeed('7f3a2')).toBe(hashSeed('7f3a2'));
  });

  it('separates seeds that differ by one character', () => {
    expect(hashSeed('7f3a2')).not.toBe(hashSeed('7f3a3'));
  });

  it('always produces an unsigned 32-bit integer', () => {
    for (const seed of ['', 'a', 'zzzzzzzz', '0', 'The Ganache']) {
      const h = hashSeed(seed);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('mulberry32', () => {
  it('produces floats in [0, 1)', () => {
    const rng = mulberry32(12345);

    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('replays the same sequence from the same state', () => {
    const a = Array.from({ length: 20 }, mulberry32(999));
    const b = Array.from({ length: 20 }, mulberry32(999));
    expect(a).toEqual(b);
  });

  it('spreads values across the unit interval', () => {
    const rng = mulberry32(42);
    const buckets = new Array(10).fill(0);

    for (let i = 0; i < 10000; i++) buckets[Math.floor(rng() * 10)]++;

    // A fair generator puts ~1000 in each bucket; this only catches gross bias.
    for (const count of buckets) expect(count).toBeGreaterThan(700);
  });
});

describe('makeRng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = Array.from({ length: 30 }, makeRng('abc123'));
    const b = Array.from({ length: 30 }, makeRng('abc123'));
    expect(a).toEqual(b);
  });

  it('gives a different sequence for a different seed', () => {
    const a = Array.from({ length: 30 }, makeRng('abc123'));
    const b = Array.from({ length: 30 }, makeRng('abc124'));
    expect(a).not.toEqual(b);
  });
});

describe('randomSeed', () => {
  it('is URL-safe and short', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomSeed()).toMatch(/^[a-z0-9]{1,8}$/);
    }
  });

  it('rarely collides', () => {
    const seeds = new Set(Array.from({ length: 500 }, randomSeed));
    expect(seeds.size).toBeGreaterThan(495);
  });
});
