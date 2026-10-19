// ================= A$$IST V4.0 — SERVICE WORKER OFFLINE-FIRST =================
const CACHE_NAME = 'assist-app-shell-v20261019e';

const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './logo.jpg',
    './style.css',
    './style.css?v=20261019d',
    './estado-nube.js',
    './estado-nube.js?v=20261019d',
    './seguridad-modales.js',
    './seguridad-modales.js?v=20261019d',
    './tasas-calculadora.js',
    './tasas-calculadora.js?v=20261019d',
    './cuentas-movimientos.js',
    './cuentas-movimientos.js?v=20261019d',
    './metas-agenda.js',
    './metas-agenda.js?v=20261019d',
    './askbot-guia.js',
    './askbot-guia.js?v=20261019d',
    './gestion-arranque.js',
    './gestion-arranque.js?v=20261019e'
];

const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await Promise.allSettled(
                LOCAL_ASSETS.map((url) =>
                    fetch(url, { cache: 'reload' })
                        .then((res) => {
                            if (res && res.ok) return cache.put(url, res);
                        })
                        .catch(() => {})
                )
            );
            await Promise.allSettled(
                CDN_ASSETS.map((url) =>
                    fetch(url)
                        .then((res) => {
                            if (res && (res.ok || res.type === 'opaque')) return cache.put(url, res);
                        })
                        .catch(() => {})
                )
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) return caches.delete(k);
                })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // No interceptar llamadas en vivo a Supabase ni APIs externas de tasas;
    // las tasas ya tienen su propio snapshot persistente en localStorage (assist_tasas_dia_snapshot_v2).
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('rafnixg') ||
        url.hostname.includes('dolarapi.com') ||
        url.hostname.includes('usdt.com.ve') ||
        url.hostname.includes('er-api.com')
    ) {
        return;
    }

    // Navegación principal (abrir la app sin internet en iPhone / Safari / PWA / Chrome)
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((networkRes) => {
                    const copy = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    return networkRes;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_NAME);
                    return (
                        (await cache.match(req, { ignoreSearch: true })) ||
                        (await cache.match('./index.html', { ignoreSearch: true })) ||
                        (await cache.match('./', { ignoreSearch: true }))
                    );
                })
        );
        return;
    }

    // Archivos del App Shell (CSS, JS, imágenes, fuentes, CDN): Red primero con respaldo inmediato en caché
    event.respondWith(
        fetch(req)
            .then((networkRes) => {
                if (networkRes && (networkRes.ok || networkRes.type === 'opaque')) {
                    const copy = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return networkRes;
            })
            .catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                const exact = await cache.match(req);
                if (exact) return exact;
                const withoutQuery = await cache.match(req, { ignoreSearch: true });
                if (withoutQuery) return withoutQuery;
                return Response.error();
            })
    );
});
