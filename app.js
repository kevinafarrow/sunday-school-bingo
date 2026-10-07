/**
 * Sunday School Bingo — app wiring.
 *
 * All the logic worth testing lives in ./src; this file is the part that only
 * makes sense with a browser attached: layout fitting, touch handling, storage,
 * and the win celebration.
 */

import { parsePool, squaresNeeded, SQUARES_PER_CARD } from './src/pool.js';
import { randomSeed } from './src/rng.js';
import { buildCard, freshMarks, CELL_COUNT, FREE_INDEX, GRID_SIZE } from './src/card.js';
import { score } from './src/win.js';
import { statusLine, buildShareText } from './src/share.js';
import { loadGame, saveGame, clearGame } from './src/storage.js';
import { wordsAsChunks } from './src/text.js';
import { seasonFor } from './src/liturgy.js';
import { burst } from './src/confetti.js';

const LONG_PRESS_MS = 400;
const SEED_PARAM = 'card';

/** Ceiling for auto-fitted text, so a two-word square doesn't shout. */
const MAX_FONT_PX = 34;

/**
 * Below this, keeping a word intact costs more than breaking it, and the chunk
 * is allowed to split.
 *
 * Deliberately low: a mangled word reads as a bug, so it should only ever be
 * the alternative to text nobody could read at all. At 7px nothing in the
 * current pool breaks on a 375px-or-wider phone — the two worst words land at
 * 7.2px and 7.3px — and the hatch only opens on very narrow screens, where the
 * honest alternative is 6px.
 */
const MIN_UNBROKEN_PX = 7;

const el = {
  card: document.getElementById('card'),
  tally: document.getElementById('tally'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorBody: document.getElementById('error-body'),
  shareBtn: document.getElementById('share-btn'),
  newBtn: document.getElementById('new-btn'),
  confetti: document.getElementById('confetti'),
  peek: document.getElementById('peek'),
  peekText: document.getElementById('peek-text'),
  banner: document.getElementById('banner'),
  bannerWord: document.getElementById('banner-word'),
  bannerSub: document.getElementById('banner-sub'),
  bannerShare: document.getElementById('banner-share'),
  bannerClose: document.getElementById('banner-close'),
  toast: document.getElementById('toast'),
};

/** @type {{pool: string[], seed: string, cells: string[], marks: boolean[], lineCount: number}} */
const state = {
  pool: [],
  seed: '',
  cells: [],
  marks: [],
  lineCount: 0,
};

/** @type {HTMLButtonElement[]} */
let cellNodes = [];
let stopConfetti = () => {};

/* ---------- seed in the URL ---------- */

function readSeed() {
  const hash = location.hash.replace(/^#/, '');
  const seed = new URLSearchParams(hash).get(SEED_PARAM);
  return seed && /^[a-z0-9]{1,16}$/i.test(seed) ? seed : null;
}

function writeSeed(seed, { replace = true } = {}) {
  const url = `${location.pathname}${location.search}#${SEED_PARAM}=${seed}`;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

/* ---------- rendering ---------- */

/**
 * Pick a glass colour for a cell. Stepping two hues per row breaks up the
 * vertical banding you'd get from `index % 5`.
 */
function paneClass(index) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return `pane--${(row * 2 + col) % 5}`;
}

/**
 * Build a cell's text as one element per unbreakable chunk.
 *
 * Each chunk is `white-space: nowrap`, so the only way text can break mid-word
 * is if the fitter explicitly marks that chunk breakable — which keeps one
 * monster like "fundamentally" from licensing every word beside it to shatter.
 *
 * @param {string} content
 * @returns {HTMLSpanElement}
 */
function buildText(content) {
  const text = document.createElement('span');
  text.className = 'cell__text';

  const words = wordsAsChunks(content);

  words.forEach((chunks, w) => {
    if (w > 0) text.append(' ');

    for (const chunk of chunks) {
      const node = document.createElement('span');
      node.className = 'chunk';
      node.textContent = chunk;
      text.append(node);
    }
  });

  return text;
}

function renderCard() {
  const frag = document.createDocumentFragment();
  cellNodes = [];

  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `cell ${paneClass(i)}`;
    cell.dataset.index = String(i);

    if (i === FREE_INDEX) cell.classList.add('cell--free');

    cell.append(buildText(state.cells[i]));

    frag.append(cell);
    cellNodes.push(cell);
  }

  el.card.replaceChildren(frag);
  el.card.setAttribute('aria-busy', 'false');
  paintMarks();
  fitAllText();
}

function paintMarks() {
  const result = score(state.marks);

  cellNodes.forEach((cell, i) => {
    const marked = state.marks[i];
    const winning = result.cells.has(i);

    cell.classList.toggle('is-marked', marked);
    cell.classList.toggle('is-winning', winning);
    cell.setAttribute('aria-pressed', String(marked));

    const label = i === FREE_INDEX ? 'Free space, always marked' : state.cells[i];
    cell.setAttribute('aria-label', `${label}. ${marked ? 'Marked' : 'Not marked'}`);
  });

  el.tally.textContent = statusLine(result);
  el.tally.classList.toggle('tally--bingo', result.hasBingo);

  return result;
}

/* ---------- auto-fitting the text ---------- */

/** Off-screen element used to measure word widths. */
let measurer = null;

function getMeasurer() {
  if (!measurer) {
    measurer = document.createElement('span');
    measurer.setAttribute('aria-hidden', 'true');
    measurer.style.cssText =
      'position:absolute;left:-9999px;top:0;white-space:pre;visibility:hidden;font-size:100px;';
    document.body.append(measurer);
  }

  return measurer;
}

/**
 * Measure each chunk's width per 1px of font size.
 *
 * Text width scales linearly with font size, so measuring once at 100px gives a
 * ratio that converts straight into a maximum font size for any cell width.
 * Cached on the elements, since a cell's text never changes after render.
 *
 * @param {HTMLElement} cell
 * @returns {{node: HTMLElement, ratio: number}[]}
 */
function chunkRatios(cell) {
  const nodes = [...cell.querySelectorAll('.chunk')];
  if (nodes.length === 0) return [];

  if (nodes[0].dataset.ratio === undefined) {
    const style = getComputedStyle(cell);
    const probe = getMeasurer();
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontWeight = style.fontWeight;

    // letter-spacing computes to px against the cell's *current* font size, so
    // copying it verbatim onto a 100px probe under-measures badly — which is
    // how the em-spaced "FREE SPACE" ended up broken across lines. Scale it.
    const spacing = parseFloat(style.letterSpacing);
    const base = parseFloat(style.fontSize) || 16;
    probe.style.letterSpacing = Number.isFinite(spacing)
      ? `${(spacing / base) * 100}px`
      : 'normal';

    for (const node of nodes) {
      probe.textContent = node.textContent;
      node.dataset.ratio = String(probe.getBoundingClientRect().width / 100);
    }
  }

  return nodes.map((node) => ({ node, ratio: Number(node.dataset.ratio) }));
}

/**
 * Decide which chunks may break, and the font size ceiling that follows.
 *
 * A chunk is allowed to break only when keeping it whole would force the whole
 * square below {@link MIN_UNBROKEN_PX}. The ceiling is then set by the widest
 * chunk that still has to survive intact.
 *
 * @param {{node: HTMLElement, ratio: number}[]} chunks
 * @param {number} availW
 * @returns {number}
 */
function applyBreakPolicy(chunks, availW) {
  let cap = Infinity;

  for (const { node, ratio } of chunks) {
    const chunkCap = ratio > 0 ? availW / ratio : Infinity;
    const breakable = chunkCap < MIN_UNBROKEN_PX;

    node.classList.toggle('chunk--breakable', breakable);
    if (!breakable) cap = Math.min(cap, chunkCap);
  }

  return cap;
}

/**
 * Shrink a cell's text until it fits.
 *
 * Two constraints. Width is handled up front: the font is capped so the longest
 * word fits on one line, which is what keeps `break-word` from chopping
 * "Protestant" in half. Height is then binary-searched — the longest squares
 * need a font a third the size of the shortest, and a linear walk across 25
 * cells is visibly slow on a phone.
 *
 * Height is measured with scrollHeight, never width with scrollWidth: the
 * latter is rounded to an integer, so a 64.8px-wide cell reports 65 and every
 * size looks like an overflow.
 */
function fitCell(cell) {
  const text = cell.querySelector('.cell__text');
  const style = getComputedStyle(cell);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

  // The span's own box, not the cell's content box: the grid track rounds, and
  // the two differ by a few tenths of a pixel — enough that a word sized to the
  // cell overflows the span by 0.1px and gets broken. The 1px slack keeps the
  // fit off that knife edge.
  const availW = text.getBoundingClientRect().width - 1;
  const availH = cell.clientHeight - padY;
  if (availW <= 0 || availH <= 0) return;

  const cap = applyBreakPolicy(chunkRatios(cell), availW);

  const lo0 = 6;
  let lo = lo0;
  let hi = Math.max(lo0, Math.min(MAX_FONT_PX, availH, cap));
  let best = lo0;

  for (let step = 0; step < 9; step++) {
    const mid = (lo + hi) / 2;
    text.style.fontSize = `${mid}px`;

    if (text.scrollHeight <= availH + 0.5) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  text.style.fontSize = `${best}px`;
}

let fitScheduled = false;

function fitAllText() {
  if (fitScheduled) return;
  fitScheduled = true;

  requestAnimationFrame(() => {
    fitScheduled = false;
    for (const cell of cellNodes) fitCell(cell);
  });
}

/* ---------- marking ---------- */

function toggle(index) {
  if (index === FREE_INDEX) return;

  state.marks[index] = !state.marks[index];
  saveGame(localStorage, state.seed, state.cells, state.marks);

  const result = paintMarks();
  buzz(state.marks[index] ? 12 : 6);

  if (result.lines.length > state.lineCount) celebrate(result);
  else if (!el.banner.hidden && result.hasBingo) updateBanner(result);
  else if (!result.hasBingo) el.banner.hidden = true;

  state.lineCount = result.lines.length;
}

function buzz(ms) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* vibration is a nicety; never let it break a tap */
    }
  }
}

/**
 * Keep the banner describing the card as it stands. It stays open while you
 * carry on playing, so freezing it at the winning moment would leave it
 * disagreeing with both the tally and whatever "Copy result" produces.
 */
function updateBanner(result) {
  el.bannerWord.textContent = result.blackout ? 'BLACKOUT!' : 'BINGO!';
  el.bannerSub.textContent = result.blackout
    ? 'Every square. Genuinely impressive.'
    : `${result.lines.length === 1 ? 'One line' : `${result.lines.length} lines`} · ${result.count}/25 squares`;
}

/**
 * Confetti in the colour the card is currently wearing: the accent, a wash of
 * it, and the ink, read straight off the stylesheet so the season stays the
 * single source of colour.
 */
function seasonPalette() {
  const style = getComputedStyle(document.documentElement);
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;

  const accent = read('--accent', '#3f6b4a');
  return [accent, accent, read('--ink', '#1a1714'), read('--rule', '#cdc5b4')];
}

function celebrate(result) {
  stopConfetti();
  stopConfetti = burst(el.confetti, seasonPalette());
  buzz([0, 40, 60, 90]);

  updateBanner(result);
  el.banner.hidden = false;
}

/* ---------- long press to read ---------- */

let pressTimer = 0;
let peeking = false;

/**
 * Whether the press currently in progress ever became a peek.
 *
 * Suppression is keyed to the whole interaction rather than to the release,
 * because the release is not the only way a press ends: let a finger drift off
 * the card while reading a square and the browser fires pointerleave, which
 * would otherwise drop the peek and let the following click mark the very
 * square you were trying to read. Cleared on the next pointerdown.
 */
let pressWasPeek = false;

function showPeek(index) {
  peeking = true;
  pressWasPeek = true;
  el.peekText.textContent = state.cells[index];
  el.peek.hidden = false;
  buzz(8);
}

function hidePeek() {
  peeking = false;
  el.peek.hidden = true;
}

function cancelPress() {
  clearTimeout(pressTimer);
  pressTimer = 0;
}

function wireCard() {
  el.card.addEventListener('pointerdown', (event) => {
    const cell = event.target.closest('.cell');
    if (!cell) return;

    const index = Number(cell.dataset.index);
    cancelPress();
    pressWasPeek = false;
    pressTimer = setTimeout(() => showPeek(index), LONG_PRESS_MS);
  });

  // Any way a press can end: release, cancellation, or the pointer leaving the
  // card. All of them close the peek; none of them clear pressWasPeek, so the
  // click that may follow is still suppressed.
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    el.card.addEventListener(type, () => {
      cancelPress();
      if (peeking) hidePeek();
    });
  }

  el.card.addEventListener('click', (event) => {
    if (pressWasPeek) {
      event.preventDefault();
      return;
    }

    const cell = event.target.closest('.cell');
    if (!cell) return;

    toggle(Number(cell.dataset.index));
  });

  // Holding text on a phone otherwise raises the selection/callout menu.
  el.card.addEventListener('contextmenu', (event) => event.preventDefault());
}

/* ---------- sharing ---------- */

async function copyResult() {
  const text = buildShareText(state.marks, { date: new Date() });

  try {
    await navigator.clipboard.writeText(text);
    toast('Result copied — paste it in the chat');
    return;
  } catch {
    /* fall through to the legacy path below */
  }

  // Older Safari and any non-secure context land here.
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();

  const ok = document.execCommand?.('copy');
  area.remove();

  toast(ok ? 'Result copied — paste it in the chat' : "Couldn't copy — try again");
}

let toastTimer = 0;

function toast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.hidden = true;
  }, 2600);
}

/* ---------- new card ---------- */

function newCard() {
  const played = state.marks.some((mark, i) => mark && i !== FREE_INDEX);

  if (played && !confirm('Start a new card? This one and its marks will be lost.')) {
    return;
  }

  clearGame(localStorage, state.seed);
  stopConfetti();
  el.banner.hidden = true;

  start(randomSeed(), { replace: false });
}

/* ---------- boot ---------- */

function start(seed, { replace = true } = {}) {
  state.seed = seed;
  writeSeed(seed, { replace });

  const saved = loadGame(localStorage, seed);

  if (saved) {
    // Restored, never regenerated — so editing squares.txt can't scramble a
    // game already in progress.
    state.cells = saved.cells;
    state.marks = saved.marks;
  } else {
    state.cells = buildCard(state.pool, seed);
    state.marks = freshMarks();
    saveGame(localStorage, seed, state.cells, state.marks);
  }

  state.lineCount = score(state.marks).lines.length;
  renderCard();
}

function fail(message) {
  el.loading.hidden = true;
  el.errorBody.textContent = message;
  el.error.hidden = false;
}

/**
 * Vest the page for today. The season is the only thing that chooses a colour;
 * the stylesheet does the rest off this one attribute.
 */
function applySeason() {
  document.documentElement.dataset.season = seasonFor();
}

async function main() {
  let text;

  applySeason();

  try {
    const response = await fetch('squares.txt', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    text = await response.text();
  } catch (error) {
    fail(`Couldn't load squares.txt (${error.message}). If you're offline, open the app once with a connection first.`);
    return;
  }

  state.pool = parsePool(text);

  const short = squaresNeeded(state.pool);
  if (short > 0) {
    fail(
      `squares.txt has ${state.pool.length} squares; a card needs ${SQUARES_PER_CARD}. ` +
        `Add ${short} more and reload.`
    );
    return;
  }

  try {
    start(readSeed() ?? randomSeed());
  } catch (error) {
    fail(error.message);
    return;
  }

  el.loading.hidden = true;
  wireCard();

  el.shareBtn.addEventListener('click', copyResult);
  el.bannerShare.addEventListener('click', copyResult);
  el.newBtn.addEventListener('click', newCard);
  el.bannerClose.addEventListener('click', () => {
    stopConfetti();
    el.banner.hidden = true;
  });

  // Back/forward between cards, and the orientation/resize refit.
  window.addEventListener('hashchange', () => {
    const seed = readSeed();
    if (seed && seed !== state.seed) start(seed);
  });

  const refit = () => fitAllText();
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);
  if ('ResizeObserver' in window) new ResizeObserver(refit).observe(el.card);

  // Webfont fallbacks change metrics after first paint.
  document.fonts?.ready.then(refit);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is optional; the app works without it */
    });
  });
}

main();
