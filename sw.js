/* ==========================================================================
   SERVICE WORKER CORE: ARCHITETTURA OFFLINE PERMANENTE E SVEGLIE BACKGROUND
   ========================================================================== */
const CACHE_NAME = 'studio-kanban-v26-calendar-engine';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=26.0',
  './script.js?v=26.0'
];

// 1. INSTALL: Archiviazione fisica dei file dell'app nella memoria locale dell'iPad/Telefono
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Forza l'attivazione senza attendere la chiusura delle vecchie schede
});

// 2. ACTIVATE: Pulizia profonda e distruzione dei file fantasma delle versioni precedenti
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Rimuove le cache sballate che bloccavano i pulsanti
          }
        })
      );
    })
  );
  self.clients.claim(); // Prende il controllo immediato delle pagine caricate
});

// 3. FETCH: Intercettatore di rete per caricare i file dal disco anche senza internet
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});

// 4. MESSAGE: Ricevitore asincrono per svegliare lo schermo bloccato il giorno prima alle 08:00
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'scheduleNotification') {
    const task = event.data.task;
    const now = Date.now();
    const delay = event.data.triggerAt - now;

    if (delay > 0) {
      // Configura il timer nativo delegato al sistema operativo del dispositivo
      setTimeout(() => {
        self.registration.showNotification("🚨 Scadenza Domani!", {
          body: `Ricordati che domani scade il compito: ${task.title}.`,
          tag: task.id, // Evita notifiche duplicate per lo stesso compito
          renotify: true
        });
      }, delay);
    } else {
      // Se crei un compito quando l'orario del giorno prima è già passato, ti avvisa subito
      self.registration.showNotification("🚨 Promemoria Studio!", {
        body: `Attenzione alla scadenza ravvicinata per: ${task.title}.`,
        tag: task.id,
        renotify: true
      });
    }
  }
});
