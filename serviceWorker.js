const CACHE_NAME = "langton-music-v2";

// Copied from https://developer.chrome.com/docs/workbox/caching-strategies-overview/#stale-while-revalidate
self.addEventListener('fetch', e => {
    event.respondWith(caches.open(CACHE_NAME).then(cache => {
        return cache.match(e.request).then(cachedResponse => {
            const fetchedResponse = fetch(e.request).then(networkResponse => {
                cache.put(e.request, networkResponse.clone());
                return networkResponse;
            });
        return cachedResponse || fetchedResponse;
        });
    }));
});
self.addEventListener("install", () => {
    console.log("service worker installed");
    self.skipWaiting();
});
self.addEventListener("activate", () => {
    console.log("service worker activated");
    self.clients.claim();
});
