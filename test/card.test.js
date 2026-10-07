import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildCard,
  freshMarks,
  sample,
  CELL_COUNT,
  FREE_INDEX,
  FREE_TEXT,
  GRID_SIZE,
} from '../src/card.js';
import { makeRng } from '../src/rng.js';
import { parsePool, SQUARES_PER_CARD } from '../src/pool.js';

const pool = (n) => Array.from({ length: n }, (_, i) => `Square ${i}`);
const realPool = parsePool(readFileSync(new URL('../squares.txt', import.meta.url), 'utf8'));

describe('sample', () => {
  it('draws the requested number of items', () => {
    expect(sample(pool(50), 24, makeRng('s')).length).toBe(24);
  });

  it('never repeats an item', () => {
    const drawn = sample(pool(50), 24, makeRng('s'));
    expect(new Set(drawn).size).toBe(24);
  });

  it('only draws items from the pool', () => {
    const source = pool(40);
    for (const item of sample(source, 24, makeRng('s'))) {
      expect(source).toContain(item);
    }
  });

  it('can draw the entire pool', () => {
    const source = pool(24);
    expect(new Set(sample(source, 24, makeRng('s')))).toEqual(new Set(source));
  });

  it('does not mutate the pool', () => {
    const source = pool(30);
    const before = source.slice();
    sample(source, 24, makeRng('s'));
    expect(source).toEqual(before);
  });

  it('reaches every item of a larger pool across many seeds', () => {
    const source = pool(40);
    const seen = new Set();

    for (let i = 0; i < 300; i++) {
      for (const item of sample(source, 24, makeRng(`seed${i}`))) seen.add(item);
    }

    expect(seen.size).toBe(40);
  });
});

describe('buildCard', () => {
  it('builds 25 cells', () => {
    expect(buildCard(realPool, 'abc').length).toBe(CELL_COUNT);
    expect(CELL_COUNT).toBe(GRID_SIZE * GRID_SIZE);
  });

  it('puts FREE SPACE dead centre', () => {
    const cells = buildCard(realPool, 'abc');
    expect(cells[FREE_INDEX]).toBe(FREE_TEXT);
    expect(FREE_INDEX).toBe(12);
  });

  it('fills the other 24 cells with distinct squares from the pool', () => {
    const cells = buildCard(realPool, 'abc');
    const others = cells.filter((_, i) => i !== FREE_INDEX);

    expect(others.length).toBe(SQUARES_PER_CARD);
    expect(new Set(others).size).toBe(SQUARES_PER_CARD);
    for (const cell of others) expect(realPool).toContain(cell);
  });

  it('is deterministic for a seed', () => {
    expect(buildCard(realPool, 'abc')).toEqual(buildCard(realPool, 'abc'));
  });

  it('lays out differently for different seeds', () => {
    expect(buildCard(realPool, 'abc')).not.toEqual(buildCard(realPool, 'abd'));
  });

  it('draws different content once the pool is bigger than a card', () => {
    const big = pool(60);
    const a = new Set(buildCard(big, 'abc'));
    const b = new Set(buildCard(big, 'xyz'));
    expect(a).not.toEqual(b);
  });

  it('refuses a pool that is too small, and says how many more are needed', () => {
    expect(() => buildCard(pool(23), 'abc')).toThrow(RangeError);
    expect(() => buildCard(pool(23), 'abc')).toThrow(/Add 1 more/);
    expect(() => buildCard([], 'abc')).toThrow(/Add 24 more/);
  });

  it('accepts a pool of exactly 24', () => {
    expect(() => buildCard(pool(24), 'abc')).not.toThrow();
  });
});

describe('freshMarks', () => {
  it('marks only the free space', () => {
    const marks = freshMarks();
    expect(marks.length).toBe(CELL_COUNT);
    expect(marks[FREE_INDEX]).toBe(true);
    expect(marks.filter(Boolean).length).toBe(1);
  });

  it('returns an independent array each time', () => {
    const a = freshMarks();
    a[0] = true;
    expect(freshMarks()[0]).toBe(false);
  });
});
