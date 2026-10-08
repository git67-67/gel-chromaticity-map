/* Service worker: lets the page open offline after the first visit.
   __VERSION__ is replaced by tools/build.py with a hash of the page, so a new build refreshes the cache. */
const CACHE = 'gel-map-__VERSION__';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gel-map-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* network first for the page (so updates show up), cache as fallback; cache first for everything else */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;   // fonts etc. go straight to the network
  const isPage = req.mode === 'navigate';
  e.respondWith(isPage
    ? fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; }).catch(() => caches.match('index.html'))
    : caches.match(req).then(r => r || fetch(req)));
});
