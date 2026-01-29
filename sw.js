// Service Worker for Sayulita Birds Flashcard App
const CACHE_NAME = 'sayulita-birds-v5';

// All files to cache
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/storage.js',
    './js/data.js',
    './js/flashcard.js',
    './js/quiz.js',
    './js/app.js',
    './data/birds.json',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install: cache core assets only (media cached on demand via message)
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: serve from cache, fallback to network, cache new fetches
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.origin !== location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                if (!response || response.status !== 200) return response;

                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => {
                if (url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png')) {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#e8f5e9" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="#666" font-size="16">Photo unavailable offline</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            });
        })
    );
});

// Handle cache-media messages from the app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_FILE') {
        const url = event.data.url;
        event.waitUntil(
            caches.open(CACHE_NAME).then(async cache => {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                } catch (e) {
                    // ignore fetch failures
                }
            })
        );
    }

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
