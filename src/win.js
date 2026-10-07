/**
 * Scoring.
 *
 * Any of the twelve lines wins — five rows, five columns, two diagonals — and
 * the free space counts as marked, as it does in every bingo hall. The game
 * does not end on the first line: it keeps counting further lines and a
 * blackout, so there is still something to play for in the second half.
 */

import { GRID_SIZE, CELL_COUNT } from './card.js';

/**
 * All twelve winning lines, each as five cell indices.
 *
 * @type {ReadonlyArray<ReadonlyArray<number>>}
 */
export const LINES = buildLines();

function buildLines() {
  const lines = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) row.push(r * GRID_SIZE + c);
    lines.push(row);
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    const col = [];
    for (let r = 0; r < GRID_SIZE; r++) col.push(r * GRID_SIZE + c);
    lines.push(col);
  }

  const down = [];
  const up = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    down.push(i * GRID_SIZE + i);
    up.push(i * GRID_SIZE + (GRID_SIZE - 1 - i));
  }
  lines.push(down, up);

  return lines;
}

/**
 * Every complete line on the card.
 *
 * @param {boolean[]} marks
 * @returns {number[][]}
 */
export function winningLines(marks) {
  return LINES.filter((line) => line.every((i) => marks[i])).map((line) => line.slice());
}

/**
 * The set of cells belonging to any complete line — what the UI lights gold.
 *
 * @param {boolean[]} marks
 * @returns {Set<number>}
 */
export function winningCells(marks) {
  const cells = new Set();
  for (const line of winningLines(marks)) {
    for (const i of line) cells.add(i);
  }
  return cells;
}

/**
 * How many cells are marked, free space included.
 *
 * @param {boolean[]} marks
 * @returns {number}
 */
export function markedCount(marks) {
  return marks.reduce((n, marked) => n + (marked ? 1 : 0), 0);
}

/**
 * Whether every cell is marked.
 *
 * @param {boolean[]} marks
 * @returns {boolean}
 */
export function isBlackout(marks) {
  return markedCount(marks) === CELL_COUNT;
}

/**
 * The full scoring picture for a set of marks.
 *
 * @param {boolean[]} marks
 * @returns {{lines: number[][], cells: Set<number>, count: number, blackout: boolean, hasBingo: boolean}}
 */
export function score(marks) {
  const lines = winningLines(marks);

  return {
    lines,
    cells: winningCells(marks),
    count: markedCount(marks),
    blackout: isBlackout(marks),
    hasBingo: lines.length > 0,
  };
}
