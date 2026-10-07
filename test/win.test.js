import { describe, it, expect } from 'vitest';
import { LINES, winningLines, winningCells, markedCount, isBlackout, score } from '../src/win.js';
import { freshMarks, CELL_COUNT, FREE_INDEX } from '../src/card.js';

/** Marks with the free space set, plus whichever cells are listed. */
function marksWith(...indices) {
  const marks = freshMarks();
  for (const i of indices) marks[i] = true;
  return marks;
}

describe('LINES', () => {
  it('is the twelve lines of a 5×5 card', () => {
    expect(LINES.length).toBe(12);
  });

  it('gives every line five cells', () => {
    for (const line of LINES) expect(line.length).toBe(5);
  });

  it('keeps every line within the grid', () => {
    for (const line of LINES) {
      for (const i of line) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(CELL_COUNT);
      }
    }
  });

  it('has no duplicate lines', () => {
    const keys = LINES.map((line) => line.join(','));
    expect(new Set(keys).size).toBe(12);
  });

  it('includes the expected rows, columns and diagonals', () => {
    const keys = LINES.map((line) => line.join(','));

    expect(keys).toContain('0,1,2,3,4'); // first row
    expect(keys).toContain('20,21,22,23,24'); // last row
    expect(keys).toContain('0,5,10,15,20'); // first column
    expect(keys).toContain('4,9,14,19,24'); // last column
    expect(keys).toContain('0,6,12,18,24'); // ↘ diagonal
    expect(keys).toContain('4,8,12,16,20'); // ↙ diagonal
  });

  it('routes exactly four lines through the free space', () => {
    const through = LINES.filter((line) => line.includes(FREE_INDEX));
    expect(through.length).toBe(4); // its row, its column, both diagonals
  });
});

describe('winningLines', () => {
  it('finds nothing on a fresh card', () => {
    expect(winningLines(freshMarks())).toEqual([]);
  });

  it('finds nothing for four of five in a row', () => {
    expect(winningLines(marksWith(0, 1, 2, 3))).toEqual([]);
  });

  it('detects each of the twelve lines when completed on its own', () => {
    for (const line of LINES) {
      const result = winningLines(marksWith(...line));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([...line]);
    }
  });

  it('counts the free space toward a line', () => {
    // The centre row needs only its four non-free cells.
    const result = winningLines(marksWith(10, 11, 13, 14));
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([10, 11, 12, 13, 14]);
  });

  it('reports several lines at once', () => {
    // Top row and left column share cell 0.
    const result = winningLines(marksWith(0, 1, 2, 3, 4, 5, 10, 15, 20));
    expect(result).toHaveLength(2);
  });

  it('reports all twelve on a blackout', () => {
    expect(winningLines(new Array(CELL_COUNT).fill(true))).toHaveLength(12);
  });

  it('returns copies, so callers cannot corrupt LINES', () => {
    const result = winningLines(marksWith(0, 1, 2, 3, 4));
    result[0][0] = 999;
    expect(LINES[0][0]).toBe(0);
  });
});

describe('winningCells', () => {
  it('is empty without a line', () => {
    expect(winningCells(freshMarks()).size).toBe(0);
  });

  it('collects the cells of one line', () => {
    expect(winningCells(marksWith(0, 1, 2, 3, 4))).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('merges overlapping lines without repeating the shared cell', () => {
    const cells = winningCells(marksWith(0, 1, 2, 3, 4, 5, 10, 15, 20));
    expect(cells).toEqual(new Set([0, 1, 2, 3, 4, 5, 10, 15, 20]));
    expect(cells.size).toBe(9);
  });
});

describe('markedCount', () => {
  it('counts the free space', () => {
    expect(markedCount(freshMarks())).toBe(1);
  });

  it('counts marks', () => {
    expect(markedCount(marksWith(0, 1, 2))).toBe(4);
  });

  it('counts a blackout as 25', () => {
    expect(markedCount(new Array(CELL_COUNT).fill(true))).toBe(CELL_COUNT);
  });
});

describe('isBlackout', () => {
  it('is false until every cell is marked', () => {
    const almost = new Array(CELL_COUNT).fill(true);
    almost[7] = false;

    expect(isBlackout(freshMarks())).toBe(false);
    expect(isBlackout(almost)).toBe(false);
    expect(isBlackout(new Array(CELL_COUNT).fill(true))).toBe(true);
  });
});

describe('score', () => {
  it('summarises a fresh card', () => {
    expect(score(freshMarks())).toMatchObject({
      lines: [],
      count: 1,
      blackout: false,
      hasBingo: false,
    });
  });

  it('summarises a single line', () => {
    const result = score(marksWith(0, 1, 2, 3, 4));
    expect(result.hasBingo).toBe(true);
    expect(result.lines).toHaveLength(1);
    expect(result.count).toBe(6); // five in the row plus the free space
    expect(result.blackout).toBe(false);
  });

  it('summarises a blackout', () => {
    const result = score(new Array(CELL_COUNT).fill(true));
    expect(result).toMatchObject({ count: 25, blackout: true, hasBingo: true });
    expect(result.lines).toHaveLength(12);
  });
});
