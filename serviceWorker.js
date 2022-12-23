const CACHE_NAME = "langton-music-v2";

if (location.protocol.indexOf('file') === -1 && location.host.indexOf('localhost') === -1) {

    // Copied from https://developer.chrome.com/docs/workbox/caching-strategies-overview/#stale-while-revalidate
    self.addEventListener('fetch', e => {
        e.respondWith(caches.open(CACHE_NAME).then(cache => {
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
    self.addEventListener("activate", e => {
        console.log("service worker activated");
        e.waitUntil(self.clients.claim());
    });

} else {
    console.error('Service worker is aborting, development version');
}
