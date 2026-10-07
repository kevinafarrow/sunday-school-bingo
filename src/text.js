/**
 * Text segmentation for the auto-fitting card.
 */

/**
 * Characters after which a line may wrap.
 *
 * Hyphens and dashes only. A slash looks like a break opportunity but isn't —
 * Chrome keeps "Hebrew/Greek" together — and the asymmetry matters: a chunk
 * list that is too coarse merely sizes the text a little smaller, while one
 * that is too fine lets the fitter pick a size the browser can only honour by
 * breaking a word mid-syllable.
 */
const BREAK_AFTER = new Set(['-', '–', '—']);

/**
 * Split one whitespace-delimited word into the runs a browser can't break
 * apart. The break character stays on the chunk that precedes it, which is
 * where it renders.
 *
 * @param {string} word
 * @returns {string[]}
 */
function chunksOf(word) {
  const chunks = [];
  let chunk = '';

  for (const char of word) {
    chunk += char;
    if (BREAK_AFTER.has(char)) {
      chunks.push(chunk);
      chunk = '';
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks;
}

/**
 * Split text into words, each word as its list of unbreakable chunks.
 *
 * The card renders one element per chunk so that a single over-long word can be
 * allowed to break without granting the same licence to its neighbours.
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function wordsAsChunks(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map(chunksOf);
}

/**
 * Every unbreakable chunk in the text, flattened.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function unbreakableChunks(text) {
  return wordsAsChunks(text).flat();
}
