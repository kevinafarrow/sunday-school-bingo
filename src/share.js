/**
 * The shareable result — a Wordle-style emoji grid.
 *
 * This is how a win actually travels: pasted into a group chat, legible at a
 * glance, and it gives away the shape of the win rather than the text of the
 * squares. Green is the winning line, yellow your other marks.
 */

import { GRID_SIZE, FREE_INDEX } from './card.js';
import { score } from './win.js';

const TITLE = 'Sunday School Bingo';
const SITE = 'kevinafarrow.github.io/sunday-school-bingo';

const WIN = '🟩';
const MARK = '🟨';
const BLANK = '⬜';
const FREE = '⭐';

/**
 * Format a date the way the share header wants it, e.g. "Oct 6".
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * The headline describing how the game went.
 *
 * @param {{lines: number[][], count: number, blackout: boolean}} result
 * @returns {string}
 */
export function statusLine(result) {
  const tally = `${result.count}/25`;

  if (result.blackout) return `BLACKOUT! · ${tally}`;
  if (result.lines.length > 1) return `BINGO ×${result.lines.length} · ${tally}`;
  if (result.lines.length === 1) return `BINGO! · ${tally}`;
  return `No bingo yet · ${tally}`;
}

/**
 * The emoji grid on its own, one row per line.
 *
 * The free space keeps its star whether or not it is part of a winning line —
 * it reads more clearly as the fixed centre of the card.
 *
 * @param {boolean[]} marks
 * @returns {string}
 */
export function emojiGrid(marks) {
  const { cells } = score(marks);
  const rows = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    let row = '';

    for (let c = 0; c < GRID_SIZE; c++) {
      const i = r * GRID_SIZE + c;
      if (i === FREE_INDEX) row += FREE;
      else if (cells.has(i)) row += WIN;
      else if (marks[i]) row += MARK;
      else row += BLANK;
    }

    rows.push(row);
  }

  return rows.join('\n');
}

/**
 * The complete text copied to the clipboard.
 *
 * @param {boolean[]} marks
 * @param {{date?: Date, site?: string}} [options]
 * @returns {string}
 */
export function buildShareText(marks, options = {}) {
  const date = options.date ?? new Date();
  const site = options.site ?? SITE;

  return [
    `${TITLE} — ${formatDate(date)}`,
    statusLine(score(marks)),
    '',
    emojiGrid(marks),
    '',
    site,
  ].join('\n');
}
