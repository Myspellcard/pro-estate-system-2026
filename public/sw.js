// Service Worker for PWA and Notifications
const CACHE_NAME = 'dar-rent-nest-v2';
const urlsToCache = [
  '/',
  '/index.html',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - use fresh HTML for app navigation, cache only as fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (event.data) {
    let data;
    try { data = event.data.json(); } catch { data = {}; }
    const options = {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Message event for badge updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE_COUNT') {
    const count = event.data.count;
    if (count > 0) {
      self.registration.setAppBadge(count);
    } else {
      self.registration.clearAppBadge();
    }
  }
});
