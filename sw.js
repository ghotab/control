const CACHE = 'tab-v2';

const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];


// INSTALACIÓN
self.addEventListener('install', event => {

    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(ASSETS))
    );

});


// ACTIVACIÓN
self.addEventListener('activate', event => {

    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE)
                    .map(k => caches.delete(k))
            );
        })
    );

    self.clients.claim();

});


// FETCH
self.addEventListener('fetch', event => {

    event.respondWith(

        fetch(event.request)
            .then(response => {

                const clone = response.clone();

                caches.open(CACHE)
                    .then(cache => cache.put(event.request, clone));

                return response;

            })
            .catch(() => caches.match(event.request))

    );

});


// PUSH NOTIFICATION
self.addEventListener('push', event => {

    let data = {};

    try {
        data = event.data.json();
    } catch {
        data = {
            title: 'Nueva Falla',
            body: 'Existe una nueva incidencia pendiente.'
        };
    }

    event.waitUntil(

        self.registration.showNotification(data.title, {

            body: data.body,
            icon: './icon-192.png',
            badge: './icon-192.png',

            vibrate: [200, 100, 200],

            data: {
                url: data.url || './'
            }

        })

    );

});


// CLICK EN NOTIFICACIÓN
self.addEventListener('notificationclick', event => {

    event.notification.close();

    event.waitUntil(

        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(windowClients => {

            for (const client of windowClients) {

                if (client.url === event.notification.data.url) {
                    return client.focus();
                }

            }

            return clients.openWindow(event.notification.data.url);

        })

    );

});