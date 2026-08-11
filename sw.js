const CACHE_NAME = 'studio-kanban-v9-mobile';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); }))));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((cachedResponse) => cachedResponse || fetch(e.request)));
});
