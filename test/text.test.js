import { describe, it, expect } from 'vitest';
import { unbreakableChunks } from '../src/text.js';

describe('unbreakableChunks', () => {
  it('splits on whitespace', () => {
    expect(unbreakableChunks('JD is absent')).toEqual(['JD', 'is', 'absent']);
  });

  it('does not split after a slash, which browsers do not wrap on', () => {
    expect(unbreakableChunks('Hebrew/Greek')).toEqual(['Hebrew/Greek']);
  });

  it('splits after hyphens and dashes, keeping them on the left chunk', () => {
    expect(unbreakableChunks('Eye-z-eye-ah')).toEqual(['Eye-', 'z-', 'eye-', 'ah']);
    expect(unbreakableChunks('a–b')).toEqual(['a–', 'b']);
    expect(unbreakableChunks('a—b')).toEqual(['a—', 'b']);
  });

  it('collapses runs of whitespace and ignores leading or trailing space', () => {
    expect(unbreakableChunks('  a \n\t b  ')).toEqual(['a', 'b']);
  });

  it('returns nothing for empty or whitespace-only text', () => {
    expect(unbreakableChunks('')).toEqual([]);
    expect(unbreakableChunks('   ')).toEqual([]);
  });

  it('keeps a trailing break character as its own chunk end', () => {
    expect(unbreakableChunks('wrap-')).toEqual(['wrap-']);
  });

  it('leaves punctuation attached, since it cannot wrap away', () => {
    expect(unbreakableChunks('JD says, "What\'s doing?"')).toEqual([
      'JD',
      'says,',
      '"What\'s',
      'doing?"',
    ]);
  });

  it('never produces a chunk longer than the original word', () => {
    for (const text of ['Hebrew/Greek', 'Eye-z-eye-ah, again', 'fundamentally']) {
      const longest = Math.max(...unbreakableChunks(text).map((c) => c.length));
      const longestWord = Math.max(...text.split(/\s+/).map((w) => w.length));
      expect(longest).toBeLessThanOrEqual(longestWord);
    }
  });

  it('reconstructs the original text when rejoined', () => {
    const text = "There's wordplay in the original Hebrew/Greek";
    expect(unbreakableChunks(text).join('')).toBe(text.replace(/\s+/g, ''));
  });

  it('keeps a slashed pair whole but still splits its hyphens', () => {
    expect(unbreakableChunks('Hebrew/Greek re-read')).toEqual(['Hebrew/Greek', 're-', 'read']);
  });
});
