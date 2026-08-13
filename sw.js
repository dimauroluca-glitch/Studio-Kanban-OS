const CACHE_NAME = 'studio-kanban-v30-push-trigger';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=29.0',
  './script.js?v=29.0'
];

// Installa e memorizza i file nella cache locale del dispositivo
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Pulisce i residui grafici e attiva il nuovo ciclo di push
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

// Supporto offline permanente
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => cachedResponse || fetch(e.request))
  );
});

// ASCOLTATORE PROVVEDIMENTI: Esegue il trigger dei banner anche a schermo spento
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'scheduleNotification') {
    const task = event.data.task;
    const now = Date.now();
    const delay = event.data.triggerAt - now;

    if (delay > 0) {
      // Imposta il timer programmato gestito direttamente dal sistema operativo
      setTimeout(() => {
        self.registration.showNotification("🚨 Scadenza Domani!", {
          body: `Ricordati che domani scade il compito: ${task.title}.`,
          tag: task.id, // Previene doppie notifiche per lo stesso record
          renotify: true
        });
      }, delay);
    } else {
      // Se inserisci il compito quando l'orario del giorno prima alle 8:00 è già passato
      self.registration.showNotification("🚨 Promemoria Studio!", {
        body: `Attenzione alla scadenza ravvicinata per: ${task.title}.`,
        tag: task.id,
        renotify: true
      });
    }
  }
});