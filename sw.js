const CACHE_NAME = 'studio-kanban-v30-push-trigger';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=29.0',
  './script.js?v=29.0'
];


self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});


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


self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => cachedResponse || fetch(e.request))
  );
});


self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'scheduleNotification') {
    const task = event.data.task;
    const now = Date.now();
    const delay = event.data.triggerAt - now;

    if (delay > 0) {
      
      setTimeout(() => {
        self.registration.showNotification("🚨 Scadenza Domani!", {
          body: `Ricordati che domani scade il compito: ${task.title}.`,
          tag: task.id, 
          renotify: true
        });
      }, delay);
    } else {
      
      self.registration.showNotification("🚨 Promemoria Studio!", {
        body: `Attenzione alla scadenza ravvicinata per: ${task.title}.`,
        tag: task.id,
        renotify: true
      });
    }
  }
});