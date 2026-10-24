// Service worker de Cocarde. Version et liste de fichiers injectées au build.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = 'cocarde-shell-' + VERSION;

self.addEventListener('install', (e) => {
  // cache: 'reload' : jamais d'ancien fichier venu du cache HTTP de GitHub Pages (sinon écran noir)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cocarde-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Intervals.icu : toujours le réseau
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then((c) => c.match('./')).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true })).then((r) => r || fetch(req)));
});
