const CACHE_NAME = 'rule34-lesbian-v3';
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
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching files...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.warn('Some files failed to cache (this is normal on first install)', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback if offline and no cache
        return caches.match(BASE_PATH + 'index.html');
      })
  );
});