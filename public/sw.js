self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches to ensure Firebase version is loaded
      caches.keys().then((names) => {
        for (let name of names) caches.delete(name);
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
