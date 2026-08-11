const CACHE_NAME = 'studio-kanban-v13-day-before';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=6.0',
  './script.js?v=6.0'
];

// Installa e memorizza i file nella cache locale
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Pulisce le vecchie cache
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Supporto offline per i file
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => cachedResponse || fetch(e.request))
  );
});

// ASCOLTATORE SVEGLIA: Si attiva alle 8:00 del giorno prima della scadenza
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'scheduleNotification') {
    const task = event.data.task;
    const now = Date.now();
    const delay = event.data.triggerAt - now;

    if (delay > 0) {
      // Imposta il timer programmato per il giorno prima
      setTimeout(() => {
        self.registration.showNotification("🚨 Scadenza Domani!", {
          body: `Ricordati che domani scade il compito: ${task.title}.`,
          tag: task.id,
          renotify: true
        });
      }, delay);
    } else {
      // Se inserisci un compito quando il "giorno prima alle 8" è già passato
      self.registration.showNotification("🚨 Promemoria Studio!", {
        body: `Attenzione alla scadenza ravvicinata per: ${task.title}.`,
        tag: task.id,
        renotify: true
      });
    }
  }
});
