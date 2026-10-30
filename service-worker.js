// service-worker.js
const CACHE_NAME = 'SeaFishing-cache-v15';
const urlsToCache = [
    '/',
    'index.html',
    'base.css',
    'layout.css',
    'forms.css',
    'tables.css',
    'print.css',
    'responsive.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'manifest.json',
    'ícone/icon-192.png',
    'ícone/icon-512.png',
    'dados.js',
    'utils.js',
    'resumo_local.js',
    'print1.js',
    'print2.js',
    'print3.js',
    'print4.js',
    'script.js',
    'locais.js',
    'analise_avancada.js',
    'mapa.js',
    'inicio.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});