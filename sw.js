self.addEventListener('push', e => { const d = e.data ? e.data.json() : {}; e.waitUntil(self.registration.showNotification(d.title || 'Grok Bot · now', {body: d.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: {url: d.url}})); });
self.addEventListener('notificationclick', e => { e.notification.close(); if (e.notification.data && e.notification.data.url) e.waitUntil(clients.openWindow(e.notification.data.url)); });
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
