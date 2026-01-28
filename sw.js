const CACHE_NAME = 'neon-arcade-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Only handle http/https requests
    if (!e.request.url.startsWith('http')) return;

    // Ignore data URIs or external analytics if any
    if (e.request.url.includes('google-analytics')) return;

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            // Strategy: Stale-While-Revalidate
            // 1. Return cached response immediately if available
            // 2. Fetch network update in background

            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });
                return networkResponse;
            }).catch(err => {
                // Network failed
            });

            return cachedResponse || fetchPromise;
        })
    );
});
