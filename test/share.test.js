import { describe, it, expect } from 'vitest';
import { formatDate, statusLine, emojiGrid, buildShareText } from '../src/share.js';
import { score } from '../src/win.js';
import { freshMarks, CELL_COUNT } from '../src/card.js';

function marksWith(...indices) {
  const marks = freshMarks();
  for (const i of indices) marks[i] = true;
  return marks;
}

const OCT_6 = new Date(2026, 9, 6);

describe('formatDate', () => {
  it('formats as a short month and day', () => {
    expect(formatDate(OCT_6)).toBe('Oct 6');
    expect(formatDate(new Date(2026, 0, 1))).toBe('Jan 1');
    expect(formatDate(new Date(2026, 11, 25))).toBe('Dec 25');
  });
});

describe('statusLine', () => {
  it('says so when there is no bingo yet', () => {
    expect(statusLine(score(freshMarks()))).toBe('No bingo yet · 1/25');
  });

  it('announces a single line', () => {
    expect(statusLine(score(marksWith(0, 1, 2, 3, 4)))).toBe('BINGO! · 6/25');
  });

  it('counts multiple lines', () => {
    expect(statusLine(score(marksWith(0, 1, 2, 3, 4, 5, 10, 15, 20)))).toBe('BINGO ×2 · 10/25');
  });

  it('calls a full card a blackout rather than twelve bingos', () => {
    expect(statusLine(score(new Array(CELL_COUNT).fill(true)))).toBe('BLACKOUT! · 25/25');
  });
});

describe('emojiGrid', () => {
  it('draws five rows of five', () => {
    const rows = emojiGrid(freshMarks()).split('\n');
    expect(rows).toHaveLength(5);
    for (const row of rows) expect([...row]).toHaveLength(5);
  });

  it('shows a fresh card as blanks around the star', () => {
    expect(emojiGrid(freshMarks())).toBe(
      ['⬜⬜⬜⬜⬜', '⬜⬜⬜⬜⬜', '⬜⬜⭐⬜⬜', '⬜⬜⬜⬜⬜', '⬜⬜⬜⬜⬜'].join('\n')
    );
  });

  it('greens the winning line and yellows the rest', () => {
    expect(emojiGrid(marksWith(0, 1, 2, 3, 4, 6, 9, 15, 18))).toBe(
      ['🟩🟩🟩🟩🟩', '⬜🟨⬜⬜🟨', '⬜⬜⭐⬜⬜', '🟨⬜⬜🟨⬜', '⬜⬜⬜⬜⬜'].join('\n')
    );
  });

  it('keeps the star at the centre even when that line wins', () => {
    const grid = emojiGrid(marksWith(10, 11, 13, 14));
    expect(grid.split('\n')[2]).toBe('🟩🟩⭐🟩🟩');
  });

  it('greens everything but the star on a blackout', () => {
    expect(emojiGrid(new Array(CELL_COUNT).fill(true))).toBe(
      ['🟩🟩🟩🟩🟩', '🟩🟩🟩🟩🟩', '🟩🟩⭐🟩🟩', '🟩🟩🟩🟩🟩', '🟩🟩🟩🟩🟩'].join('\n')
    );
  });
});

describe('buildShareText', () => {
  it('produces the agreed format exactly', () => {
    const text = buildShareText(marksWith(0, 1, 2, 3, 4, 6, 9, 15, 18), { date: OCT_6 });

    expect(text).toBe(
      [
        'Sunday School Bingo — Oct 6',
        'BINGO! · 10/25',
        '',
        '🟩🟩🟩🟩🟩',
        '⬜🟨⬜⬜🟨',
        '⬜⬜⭐⬜⬜',
        '🟨⬜⬜🟨⬜',
        '⬜⬜⬜⬜⬜',
        '',
        'kevinafarrow.github.io/sunday-school-bingo',
      ].join('\n')
    );
  });

  it('is shareable before any bingo', () => {
    const text = buildShareText(marksWith(7), { date: OCT_6 });
    expect(text.split('\n')[1]).toBe('No bingo yet · 2/25');
  });

  it('defaults to today when no date is given', () => {
    expect(buildShareText(freshMarks())).toContain(formatDate(new Date()));
  });

  it('lets the site line be overridden', () => {
    expect(buildShareText(freshMarks(), { date: OCT_6, site: 'example.com' })).toMatch(
      /example\.com$/
    );
  });

  it('separates the header, grid and link with blank lines', () => {
    const lines = buildShareText(freshMarks(), { date: OCT_6 }).split('\n');
    expect(lines).toHaveLength(10);
    expect(lines[2]).toBe('');
    expect(lines[8]).toBe('');
  });
});
