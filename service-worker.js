/* Small Business Quick Action Plan – service worker
 * IMPORTANT: change CACHE_VERSION every time you upload a new index.html,
 * otherwise phones keep showing the old version.
 */
const CACHE_VERSION = 'sbap-v1';
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

  // Page loads: always answer with the cached app shell so it opens offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req))
    );
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
