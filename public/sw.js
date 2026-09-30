// African Network Wi-Fi Hotspot Service Worker — Offline Resilience & Installability
const CACHE_NAME = 'asuk-wifi-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/vouchers',
  '/vouchers/status',
  '/packages',
  '/wallet',
];

// Install: pre-cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first with cache fallback for pages, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Don't intercept non-GET requests or browser-extension / chrome-extension requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Next.js static assets and fonts: Cache-first
  if (
    request.url.includes('/_next/static/') ||
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages & general requests: Network-first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // If navigating to an HTML page while offline, return offline.html fallback
        if (request.headers.get('accept')?.includes('text/html')) {
          const offlineFallback = await caches.match('/offline.html');
          if (offlineFallback) return offlineFallback;
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }

        return new Response('Offline: Please connect to the Wi-Fi hotspot to continue.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

// ── Web Push Notifications (Phase 3.2) ──────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'African Network Wi-Fi';
    const options = {
      body: data.body || 'New notification from African Network',
      icon: data.icon || '/manifest-icon-192.maskable.png',
      badge: '/manifest-icon-192.maskable.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

