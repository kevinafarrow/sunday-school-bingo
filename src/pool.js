/**
 * Parsing for squares.txt — the square pool.
 *
 * The file is deliberately dumb: one square per line, so it can be edited from
 * a phone without any chance of a syntax error white-screening the app.
 */

/** Squares drawn per card. The 25th cell is always the free space. */
export const SQUARES_PER_CARD = 24;

/**
 * Turn the raw contents of squares.txt into a list of squares.
 *
 * Blank lines and `#` comments are ignored, surrounding whitespace is trimmed,
 * and duplicates are dropped (case-insensitively) so a square can't appear
 * twice on the same card.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function parsePool(text) {
  const seen = new Set();
  const squares = [];

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const key = line.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    squares.push(line);
  }

  return squares;
}

/**
 * How many more squares the pool needs before a card can be built.
 * Zero once there are enough.
 *
 * @param {string[]} pool
 * @returns {number}
 */
export function squaresNeeded(pool) {
  return Math.max(0, SQUARES_PER_CARD - pool.length);
}
