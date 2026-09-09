// Service worker de Inventory Manager — habilita instalación como PWA
// (Android/desktop/iOS) y deja el "app shell" utilizable sin conexión.
//
// No es un cache-first agresivo: esta app trabaja con datos que cambian
// todo el tiempo (ventas, stock, caja), así que cachear una respuesta vieja
// como si fuera la buena sería peligroso. La estrategia es "network first,
// cache as fallback": intenta la red siempre primero, y solo si no hay
// conexión sirve la última copia buena que haya en cache — suficiente para
// que la app no muestre una pantalla de error de Chrome sin internet, sin
// arriesgar mostrar datos de inventario desactualizados como si fueran
// actuales.
const CACHE_NAME = 'inventory-manager-shell-v1';

// Subir este número invalida el cache anterior completo — usarlo cuando
// cambien los assets estáticos que se listan más abajo (íconos, manifest).
const PRECACHE_URLS = ['/favicon.ico', '/favicon-32x32.png', '/favicon-16x16.png', '/android-chrome-192x192.png', '/site.webmanifest'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo GET es cacheable de forma segura — un POST/PATCH/DELETE (crear
    // venta, editar producto, etc.) nunca debe pasar por acá ni tener un
    // fallback de cache, tiene que fallar visiblemente si no hay conexión.
    if (request.method !== 'GET') {
        return;
    }

    // Igual, nunca cachear llamadas a la API/rutas dinámicas de Inertia —
    // solo assets estáticos (JS/CSS/imágenes/fuentes) y la navegación de
    // páginas se benefician de un fallback offline razonable.
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok && (request.mode === 'navigate' || request.destination !== '')) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return response;
            })
            .catch(() => caches.match(request).then((cached) => cached || caches.match('/dashboard'))),
    );
});
