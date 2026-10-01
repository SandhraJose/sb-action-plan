/* Small Business Quick Action Plan – service worker
 * IMPORTANT: change CACHE_VERSION every time you upload a new index.html,
 * otherwise phones keep showing the old version.
 */
const CACHE_VERSION = 'sbap-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './fonts/montserrat-400.woff2',
  './fonts/montserrat-600.woff2',
  './fonts/montserrat-700.woff2'
];

self.addEventListener('install', (event) => {
  // Do not skipWaiting automatically: the page shows an "Update available" banner
  // so a worker never loses a half-filled form because of a silent reload.
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle this site's own files. Calls to Apps Script go straight to the network.
  if (url.origin !== self.location.origin) return;

  // Page loads: try the network first (so fixes reach phones quickly), give up after
  // 4 seconds on a weak signal, and fall back to the saved copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const res = await Promise.race([
          fetch(req, { cache: 'no-store' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))
        ]);
        if (res && res.ok) { cache.put('./index.html', res.clone()); return res; }
        throw new Error('bad response');
      } catch (e) {
        return (await cache.match('./index.html')) || (await caches.match('./index.html')) || fetch(req);
      }
    })());
    return;
  }

  // Cache-first for everything else.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
