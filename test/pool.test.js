import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePool, squaresNeeded, SQUARES_PER_CARD } from '../src/pool.js';

describe('parsePool', () => {
  it('reads one square per line', () => {
    expect(parsePool('Alpha\nBravo\nCharlie')).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('ignores blank lines and comments', () => {
    const text = ['# the pool', '', 'Alpha', '   ', '# a note', 'Bravo', ''].join('\n');
    expect(parsePool(text)).toEqual(['Alpha', 'Bravo']);
  });

  it('trims surrounding whitespace', () => {
    expect(parsePool('   Alpha  \n\tBravo\t')).toEqual(['Alpha', 'Bravo']);
  });

  it('drops duplicates case-insensitively, keeping the first spelling', () => {
    expect(parsePool('JD sings\njd SINGS\nKate')).toEqual(['JD sings', 'Kate']);
  });

  it('handles CRLF line endings', () => {
    expect(parsePool('Alpha\r\nBravo\r\n')).toEqual(['Alpha', 'Bravo']);
  });

  it('keeps punctuation that matters, like quotes and apostrophes', () => {
    expect(parsePool('JD says, "What\'s doing?"')).toEqual(['JD says, "What\'s doing?"']);
  });

  it('returns nothing for an empty or comment-only file', () => {
    expect(parsePool('')).toEqual([]);
    expect(parsePool('# just comments\n#\n')).toEqual([]);
  });
});

describe('squaresNeeded', () => {
  it('counts how many more squares a card needs', () => {
    expect(squaresNeeded([])).toBe(SQUARES_PER_CARD);
    expect(squaresNeeded(new Array(10).fill('x'))).toBe(SQUARES_PER_CARD - 10);
  });

  it('is zero once there are enough', () => {
    expect(squaresNeeded(new Array(SQUARES_PER_CARD).fill('x'))).toBe(0);
    expect(squaresNeeded(new Array(99).fill('x'))).toBe(0);
  });
});

describe('the real squares.txt', () => {
  const pool = parsePool(readFileSync(new URL('../squares.txt', import.meta.url), 'utf8'));

  it('has enough squares to build a card', () => {
    expect(pool.length).toBeGreaterThanOrEqual(SQUARES_PER_CARD);
  });

  it('has no duplicates', () => {
    expect(new Set(pool.map((s) => s.toLowerCase())).size).toBe(pool.length);
  });

  it('does not contain a FREE SPACE square, which the centre cell supplies', () => {
    expect(pool.some((s) => /free\s*space/i.test(s))).toBe(false);
  });
});
