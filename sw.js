/* Service Worker – Cache-first für alle eigenen Dateien (offline-fähig).
   Bei Änderungen an Dateien VERSION erhöhen, damit Geräte die neue Fassung laden. */
var VERSION = 'v8';
var CACHE = 'salon-pwa-' + VERSION;
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/fonts.css',
  './css/base.css',
  './css/app.css',
  './css/theme-glass.css',
  './js/theme.js',
  './js/config.js',
  './js/booking.js',
  './js/app.js',
  './assets/fonts/fraunces-latin.woff2',
  './assets/fonts/fraunces-latin-ext.woff2',
  './assets/fonts/fraunces-italic-latin.woff2',
  './assets/fonts/inter-latin.woff2',
  './assets/fonts/inter-latin-ext.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-48.png',
  './icons/scissors-line.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('salon-pwa-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // OSM-Karte, Google Maps etc. nicht anfassen
  if (req.mode === 'navigate') {
    // App-Shell: immer die gecachte index.html (Hash-Navigation)
    e.respondWith(caches.match('./index.html').then(function (r) { return r || fetch(req); }).catch(function () { return fetch(req); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
