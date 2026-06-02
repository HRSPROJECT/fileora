/**
 * Fileora Service Worker - High-Performance PWA Cache Engine
 * Fully offline-first caching supporting multi-gigabyte client-side video/PDF operations.
 */

const CACHE_NAME = 'fileora-cache-v3';

// Core application and external dependency assets to pre-cache on install
const ASSETS_TO_CACHE = [
  // Local app assets
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/robots.txt',
  '/sitemap.xml',
  
  // External WebAssembly & script dependencies
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs',
  'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
  'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js',
  'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
];

// 1. Install Event: Cache all core files and WASM engines
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core shell and heavy WASM engines...');
      // Use addAll with error resilience: cache what we can, don't let one bad URL block the entire install
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(new Request(url, { mode: url.includes('unpkg.com') || url.includes('fonts.gstatic.com') ? 'cors' : 'no-cors' }))
            .then(() => console.log(`[Service Worker] Pre-cached: ${url}`))
            .catch((err) => console.error(`[Service Worker] Pre-cache failed for ${url}:`, err));
        })
      );
    })
  );
});

// 2. Activate Event: Perform cache sweep and release outdated versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Intercept network requests and serve from Cache (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension:// schemes or dev server socket requests
  if (!event.request.url.startsWith('http') && !event.request.url.startsWith('https')) return;

  // Bypass caching for PeerJS signaling server and third-party analytics API requests
  if (event.request.url.includes('peerjs.com') || event.request.url.includes('google-analytics.com')) {
    return;
  }

  // Bypass caching for Vite Dev Server assets to prevent stale code issues during development
  const url = new URL(event.request.url);
  if (
    url.hostname === 'localhost' || 
    url.hostname === '127.0.0.1' || 
    url.hostname === '0.0.0.0'
  ) {
    if (
      url.pathname.startsWith('/@') || 
      url.pathname.includes('/node_modules/') || 
      url.searchParams.has('t') || 
      url.pathname.startsWith('/src/')
    ) {
      return; // Direct network bypass for HMR & Dev modules
    }
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from Cache immediately for near-zero loading latency, but fetch in background to refresh the cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {/* Ignore background errors when offline */});

        return cachedResponse;
      }

      // If the asset is not in cache, fetch it from the network and cache it dynamically
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache standard successful responses (including CORS opaque assets)
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((err) => {
          console.warn('[Service Worker] Fetch failed (possibly offline). Serving fallback:', event.request.url, err);

          // If offline and requesting an HTML page route, map clean path to its pre-rendered .html file in cache
          if (event.request.headers.get('accept')?.includes('text/html')) {
            const url = new URL(event.request.url);
            let pathName = url.pathname;
            if (pathName.endsWith('/')) {
              pathName = pathName.slice(0, -1);
            }
            const fallbackKey = pathName === '' ? '/index.html' : pathName + '.html';
            return caches.match(fallbackKey).then((routeResponse) => {
              return routeResponse || caches.match('/index.html');
            });
          }

          // Re-throw the error so that the promise rejects cleanly, letting the browser handle it as a normal fetch error
          // instead of resolving to 'undefined' and throwing "Failed to convert value to 'Response'"
          throw err;
        });
    })
  );
});
