# Sunday School Bingo

Bingo for the podcast. Send one link; everyone gets their own card and taps
squares as things happen. Wins travel as a Wordle-style emoji grid.

**Play:** https://kevinafarrow.github.io/sunday-school-bingo

## Adding squares

Edit [`squares.txt`](squares.txt) — one square per line. Blank lines and `#`
comments are ignored. No quotes, no commas, nothing to break; you can do it from
GitHub's web UI on your phone.

Cards draw 24 random squares from the pool, so the pool is also the variety
knob: at exactly 24 squares every card holds the same items in a different
arrangement, and cards start differing in *content* from the 25th square on.

Adding squares never disturbs a game in progress — see below.

## The colour

The card is flat off-white paper with exactly one accent colour, and that
colour is whatever the Church is wearing today:

| Season | Colour |
| --- | --- |
| Ordinary Time | green |
| Advent, Lent | violet |
| Gaudete, Laetare | rose |
| Christmas, Easter | gold |
| Palm Sunday, Good Friday, Pentecost | red |

It changes itself — there is nothing to set and no dates to maintain. Every one
of those is derived from Easter and Christmas in [`src/liturgy.js`](src/liturgy.js),
using the Gregorian computus and the Roman Catholic calendar as kept in the US
(Epiphany on a Sunday). The sanctoral cycle is deliberately out of scope: saints'
days would make the colour flicker day to day rather than feel seasonal.

The season is published as `data-season` on `<html>`; the stylesheet derives
marks, the winning line, the title rule and the confetti from it. Light and dark
both follow the phone's setting.

## How it works

No backend, no accounts, no build step. Push to `main` and GitHub Pages serves
it.

- **Seeds.** A card is generated from a short seed kept in the URL
  (`#card=7f3a2`), so the same seed always lays out the same card.
- **Frozen cards.** The first time a seed is opened, its 25 squares are written
  to `localStorage` with the marks. After that the game is *restored*, never
  regenerated — which is why editing `squares.txt` mid-episode can't scramble
  anyone's card.
- **Winning.** Any of the twelve lines, free space counting. Play continues
  after the first line, tracking further lines and a blackout.
- **Offline.** A service worker caches the app shell, and fetches `squares.txt`
  network-first so new squares arrive as soon as there's a connection.

## Layout

```
index.html            markup
styles.css            the printed card, vested by season
app.js                browser wiring: layout fitting, touch, storage, celebration
src/pool.js           squares.txt parsing
src/rng.js            seeded random numbers
src/card.js           card generation
src/win.js            scoring
src/share.js          the emoji result
src/storage.js        saved games
src/liturgy.js        which season today falls in
src/text.js           where text may and may not break
src/confetti.js       the win burst
sw.js                 offline caching
squares.txt           the square pool  ← the file you edit
```

Everything worth testing is in `src/`; `app.js` holds only what needs a browser.

## Development

```sh
npm install     # vitest only — nothing ships to the browser
npm test
npm run serve   # http://localhost:8000
```

A plain static server is required: the app uses ES modules and fetches
`squares.txt`, neither of which work over `file://`.

### After changing the shell

Bump `CACHE_VERSION` in [`sw.js`](sw.js) when you change `index.html`,
`styles.css`, `app.js`, or anything in `src/`, so installed copies pick up the
new version instead of serving the old one from cache. Editing `squares.txt`
alone needs no bump — it's fetched network-first.

## Deploying

Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder
`/ (root)`. Then push.
