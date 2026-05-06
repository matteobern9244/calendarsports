/* Service Worker per notifiche push - Calendar Events */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  let data = { title: 'Calendar Events', body: '', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  const opts = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(data.title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      try {
        const u = new URL(c.url);
        if (u.origin === self.location.origin) {
          await c.focus();
          if ('navigate' in c) await c.navigate(url);
          return;
        }
      } catch (_) {}
    }
    await self.clients.openWindow(url);
  })());
});