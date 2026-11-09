// Emanus IA — Service Worker v3
// Estratégia: Cache-First para assets estáticos, Network-First para navegação

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `emanus-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `emanus-dynamic-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
  '/apple-touch-icon.png',
  '/logo-emanus-light.png',
  '/logo-emanus-dark.png',
];

// ─── INSTALL ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Assets caching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar: não-GET, API, cross-origin, Chrome extensions
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    !url.origin.includes(self.location.hostname) ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // ── Navegação: Network-First com fallback offline ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            return cached || caches.match('/dashboard') || caches.match('/');
          })
        )
    );
    return;
  }

  // ── Assets estáticos: Cache-First ──
  if (
    url.pathname.match(/\.(png|svg|ico|jpg|jpeg|webp|woff2|woff|ttf|css|js)$/) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Resto: Stale-While-Revalidate ──
  event.respondWith(
    caches.open(DYNAMIC_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        });
        return cached || fetchPromise;
      })
    )
  );
});

// ─── PUSH NOTIFICATIONS ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Emanus IA – Hora de Estudar';
    const options = {
      body: data.body || 'Chegou a hora de estudar a tua disciplina programada.',
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'emanus-notification',
      renotify: true,
      data: { url: data.url || '/dashboard' },
      actions: [
        { action: 'open', title: 'Abrir', icon: '/icon-192.png' },
        { action: 'dismiss', title: 'Fechar' },
      ],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn('[SW] Erro ao processar push:', err);
  }
});

// ─── NOTIFICATION CLICK ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const rawUrl = (event.notification.data && event.notification.data.url) || '/dashboard';
  const targetUrl = rawUrl.startsWith('http') ? '/dashboard' : rawUrl;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            if ('navigate' in client) client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});

// ─── BACKGROUND SYNC ───────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'emanus-sync') {
    console.log('[SW] Background sync triggered');
  }
});
