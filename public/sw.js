/**
 * Fileora Service Worker - PWA cache for production static deploys.
 * Local Vite dev (localhost:5173) is never intercepted — see shouldBypassFetch().
 */

const CACHE_NAME = 'fileora-cache-v7';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/pwa-icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/browser-image-compression.js',
  '/icons.svg',
  '/robots.txt',
  '/sitemap.xml',
  'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs',
  'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
  'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js',
  'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js',
];

const BYPASS_DOMAINS = [
  'peerjs.com',
  'google-analytics.com',
  'analytics.google.com',
  'googletagmanager.com',
  'cloudflareinsights.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com',
];

const isLocalDevHost = (hostname) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '0.0.0.0' ||
  hostname.endsWith('.localhost');

/** Never intercept Vite dev server or signaling/analytics hosts */
const shouldBypassFetch = (request) => {
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return true;
  if (isLocalDevHost(url.hostname)) return true;
  if (BYPASS_DOMAINS.some((d) => url.hostname.includes(d))) return true;

  if (
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.startsWith('/src/') ||
    url.searchParams.has('t')
  ) {
    return true;
  }

  return false;
};

const isNavigationRequest = (request) =>
  request.mode === 'navigate' ||
  (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));

/** SPA shell fallback: prerendered route file, then index.html */
const spaNavigationFallback = async (pathname) => {
  let pathName = pathname;
  if (pathName.endsWith('/')) pathName = pathName.slice(0, -1);

  const routeHtml = pathName && pathName !== '' ? `${pathName}.html` : '/index.html';
  const routeResponse = await caches.match(routeHtml);
  if (routeResponse) return routeResponse;

  const indexResponse = await caches.match('/index.html');
  if (indexResponse) return indexResponse;

  return caches.match('/');
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache
            .add(new Request(url, { mode: url.includes('unpkg.com') ? 'cors' : 'same-origin' }))
            .catch((err) => console.warn('[SW] Pre-cache skip:', url, err))
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (shouldBypassFetch(event.request)) return;

  const url = new URL(event.request.url);

  // HTML navigations: network-first so SPA routes (/share, etc.) always work in dev-like deploys
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => spaNavigationFallback(url.pathname))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }

      return networkFetch.then((response) => {
        if (response) return response;
        return caches.match('/index.html');
      });
    })
  );
});
