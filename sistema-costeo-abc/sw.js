// Service worker del Costeo ABC: permite instalar la página como aplicación y abrirla sin conexión.
// Estrategia "primero la red": siempre se usan los archivos más recientes y la copia guardada solo
// se usa cuando no hay internet. Los datos de Supabase nunca se guardan en caché.
const CACHE = 'vss-abc-v1';
const ARCHIVOS = [
    './', 'index.html', 'manifest.webmanifest', 'css/abc.css', 'js/abc.js', 'js/abc-seed.js',
    'icons/icon-192.png', 'icons/icon-512.png',
    '../sistema-ordenes/css/styles.css', '../sistema-ordenes/css/professional.css', '../sistema-ordenes/css/vss.css',
    '../sistema-ordenes/css/vss-3d.css', '../sistema-ordenes/css/fab-menu.css', '../sistema-ordenes/css/ordenes.css',
    '../sistema-ordenes/js/supabase-config.js', '../sistema-ordenes/js/db.js', '../sistema-ordenes/js/utils.js',
    '../sistema-ordenes/js/fab-menu.js', '../aurora/aurora.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => Promise.all(ARCHIVOS.map(u => c.add(u).catch(() => null)))));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const mismoSitio = url.origin === location.origin;
    if (!mismoSitio && url.hostname !== 'cdn.jsdelivr.net') return;   // Supabase y otros: directo a la red
    e.respondWith(
        fetch(req).then(r => {
            if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
            return r;
        }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
    );
});
