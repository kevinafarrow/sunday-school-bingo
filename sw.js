/**
 * Offline support.
 *
 * Two different jobs, two different strategies:
 *   - the app shell is cached so it opens instantly in a car or a basement;
 *   - squares.txt goes to the network first, so squares you add show up as soon
 *     as there's a connection rather than being pinned to whatever was cached.
 *
 * Bump CACHE_VERSION when the shell changes so friends don't sit on an old copy.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `sunday-school-bingo-${CACHE_VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './squares.txt',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/pool.js',
  './src/rng.js',
  './src/card.js',
  './src/win.js',
  './src/share.js',
  './src/storage.js',
  './src/text.js',
  './src/liturgy.js',
  './src/confetti.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // One missing file shouldn't abort the whole install, so each is cached
      // on its own and failures are tolerated.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/squares.txt')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('squares.txt unavailable offline');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || network;
}
