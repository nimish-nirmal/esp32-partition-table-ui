/**
 * ESP32 Partition Table UI - Service Worker
 * Provides offline caching for the application.
 * Cache version: v1
 */
const CACHE_NAME = 'esp32-partition-table-v1';

// Assets to pre-cache on first load
const PRECACHE_ASSETS = [
    '.',
    'index.html',
    'style.css',
    'app.js',
    'manifest.json'
];

// Install event: pre-cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip browser extensions and chrome-requests
    const url = new URL(event.request.url);
    if (url.protocol === 'chrome-extension:' || url.hostname === 'chrome-extension') return;

    // Skip cross-origin requests (e.g., Font Awesome CDN)
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // Cache successful responses for future offline use
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Offline fallback: return the cached homepage
                if (event.request.destination === 'document') {
                    return caches.match('index.html');
                }
                // For other resources, just fail gracefully
                return new Response('Offline', { status: 503 });
            });
        })
    );
});