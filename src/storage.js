/**
 * Saved games.
 *
 * The seed in the URL generates a card, but once a card exists its 25 squares
 * are frozen here alongside the marks. That is what makes editing squares.txt
 * safe mid-episode: a game in progress is restored from storage, never
 * regenerated from a pool that may have changed underneath it.
 */

import { CELL_COUNT, FREE_INDEX, FREE_TEXT } from './card.js';

export const STORAGE_PREFIX = 'ssb:card:';

const VERSION = 1;

function keyFor(seed) {
  return `${STORAGE_PREFIX}${seed}`;
}

/**
 * Whether a parsed storage entry is a game we can actually restore.
 *
 * Anything malformed — hand-edited, truncated, written by an older version —
 * is treated as absent rather than thrown, so a bad entry costs you a reroll
 * instead of a blank screen.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidGame(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.version !== VERSION) return false;

  const { cells, marks } = value;
  if (!Array.isArray(cells) || cells.length !== CELL_COUNT) return false;
  if (!Array.isArray(marks) || marks.length !== CELL_COUNT) return false;
  if (!cells.every((cell) => typeof cell === 'string' && cell.length > 0)) return false;
  if (!marks.every((mark) => typeof mark === 'boolean')) return false;
  if (cells[FREE_INDEX] !== FREE_TEXT || marks[FREE_INDEX] !== true) return false;

  return true;
}

/**
 * Restore a saved game, or null if there isn't a usable one.
 *
 * @param {Storage} storage
 * @param {string} seed
 * @returns {{cells: string[], marks: boolean[]} | null}
 */
export function loadGame(storage, seed) {
  let parsed;

  try {
    const raw = storage.getItem(keyFor(seed));
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isValidGame(parsed)) return null;
  return { cells: parsed.cells, marks: parsed.marks };
}

/**
 * Persist a game. Storage failures (private mode, quota) are swallowed: losing
 * persistence is worth much less than losing the running game to an exception.
 *
 * @param {Storage} storage
 * @param {string} seed
 * @param {string[]} cells
 * @param {boolean[]} marks
 * @returns {boolean} whether the write succeeded
 */
export function saveGame(storage, seed, cells, marks) {
  try {
    storage.setItem(keyFor(seed), JSON.stringify({ version: VERSION, cells, marks }));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {Storage} storage
 * @param {string} seed
 */
export function clearGame(storage, seed) {
  try {
    storage.removeItem(keyFor(seed));
  } catch {
    /* nothing worth doing if this fails */
  }
}
