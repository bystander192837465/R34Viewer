const CACHE_NAME = 'rule34-lesbian-v5';   // ← Increase this number every time you update

const BASE_PATH = '/R34Viewer/';

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'style.css',
  BASE_PATH + 'app.js',
  BASE_PATH + 'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// IMPORTANT: Take control immediately when a new SW is installed
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', name);
              return caches.delete(name);
            }
          })
        );
      }),
      // Force new service worker to control all clients immediately
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});