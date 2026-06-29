const CACHE_SHELL = 'pingme-shell-v1';
const CACHE_STATIC = 'pingme-static-v1';
const CACHE_MEDIA = 'pingme-media-v1';

const APP_SHELL = [
  '/',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Ignore partial cache failures during install
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => ![CACHE_SHELL, CACHE_STATIC, CACHE_MEDIA].includes(key))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and non-http protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // NEVER CACHE: API requests, Auth, User endpoints, AI, WebSockets/SSE
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/socket.io') ||
    url.searchParams.has('socket') ||
    request.headers.get('accept')?.includes('text/event-stream')
  ) {
    return; // Network only
  }

  // CACHE FIRST: Icons, Fonts, Images
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_MEDIA).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => {
          // Fallback image if needed
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // STALE WHILE REVALIDATE: Static scripts and styles (/_next/static)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // NETWORK FIRST: Navigations and HTML requests
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_SHELL).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        
        // Fallback to cached home shell if exact route not cached
        const fallbackShell = await caches.match('/');
        if (fallbackShell) return fallbackShell;

        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
    );
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'PingMe';
    const options = {
      body: data.body || 'You have a new message',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/monochrome-icon-512x512.png',
      data: data.url ? { url: data.url } : {},
      vibrate: [100, 50, 100],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Non-json push
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/chat';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
