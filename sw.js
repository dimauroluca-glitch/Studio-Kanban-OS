const CACHE_NAME = 'studio-kanban-v11-perfect-offline';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=6.0', /* Ora corrisponde al richiamo esatto dell'HTML */
  './script.js?v=6.0'  /* Ora corrisponde al richiamo esatto dell'HTML */
];

// Installa e memorizza i file nel disco fisso locale
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Rimuove i vecchi residui grafici e attiva il nuovo motore
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercetta la mancanza di rete e distribuisce la grafica salvata
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
