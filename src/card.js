/**
 * Card generation.
 *
 * A card is a flat array of 25 strings in reading order, with the free space
 * fixed dead centre. Generation is a pure function of (pool, seed) — but note
 * that the app freezes a generated card into storage, so editing squares.txt
 * never disturbs a game already in progress.
 */

import { makeRng } from './rng.js';
import { SQUARES_PER_CARD, squaresNeeded } from './pool.js';

/** Cards are 5×5. */
export const GRID_SIZE = 5;

/** Total cells, free space included. */
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/** Index of the centre cell. */
export const FREE_INDEX = 12;

/** Text shown in the centre cell. */
export const FREE_TEXT = 'FREE SPACE';

/**
 * Draw `count` distinct items from `items` using `rng`.
 *
 * A partial Fisher–Yates: shuffling only the prefix we need keeps the draw
 * unbiased without walking the whole pool.
 *
 * @param {string[]} items
 * @param {number} count
 * @param {() => number} rng
 * @returns {string[]}
 */
export function sample(items, count, rng) {
  const copy = items.slice();

  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, count);
}

/**
 * Build the 25 cells of a card.
 *
 * @param {string[]} pool
 * @param {string} seed
 * @returns {string[]} 25 cells, reading order, free space at {@link FREE_INDEX}
 * @throws {RangeError} if the pool is too small to fill a card
 */
export function buildCard(pool, seed) {
  const short = squaresNeeded(pool);
  if (short > 0) {
    throw new RangeError(
      `squares.txt needs ${SQUARES_PER_CARD} squares to build a card; ` +
        `it has ${pool.length}. Add ${short} more.`
    );
  }

  const drawn = sample(pool, SQUARES_PER_CARD, makeRng(seed));
  const cells = [];

  for (let i = 0; i < CELL_COUNT; i++) {
    if (i === FREE_INDEX) {
      cells.push(FREE_TEXT);
    } else {
      // Cells after the centre read one square earlier in the draw.
      cells.push(drawn[i < FREE_INDEX ? i : i - 1]);
    }
  }

  return cells;
}

/**
 * A fresh mark array: everything false except the free space.
 *
 * @returns {boolean[]}
 */
export function freshMarks() {
  const marks = new Array(CELL_COUNT).fill(false);
  marks[FREE_INDEX] = true;
  return marks;
}
