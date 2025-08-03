// Nome della cache
const CACHE_NAME = 'medical-report-analyzer-v1';
// File da mettere in cache
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
];

// Evento di installazione: apre la cache e aggiunge i file principali
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento di fetch: risponde con i dati dalla cache se disponibili, altrimenti li scarica dalla rete
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Se la risorsa è in cache, la restituisce
        if (response) {
          return response;
        }
        // Altrimenti, la scarica dalla rete
        return fetch(event.request);
      }
    )
  );
});
