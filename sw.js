const CACHE_NAME = 'studio-kanban-v12-push-engine';
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

// ASCOLTATORE SVEGLIA: Questo codice si attiva anche a telefono spento/app chiusa
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'scheduleNotification') {
    const task = event.data.task;
    
    // Calcola quanti millisecondi mancano al momento della notifica
    const now = Date.now();
    const delay = event.data.triggerAt - now;

    if (delay > 0) {
      // Imposta un timer in background controllato dal sistema operativo
      setTimeout(() => {
        self.registration.showNotification("🚨 Promemoria Studio!", {
          body: `Scadenza imminente per: ${task.title}. Controlla il tuo planner!`,
          tag: task.id, // Evita notifiche doppie per lo stesso compito
          renotify: true
        });
      }, delay);
    } else {
      // Se la data è oggi o passata, mostra immediatamente la notifica di sistema
      self.registration.showNotification("🚨 Promemoria Studio!", {
        body: `Oggi scade: ${task.title}. Mettiti al lavoro!`,
        tag: task.id,
        renotify: true
      });
    }
  }
});
