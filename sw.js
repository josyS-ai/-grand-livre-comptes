// Service Worker — Grand Livre des Comptes
// Stratégie : réseau en priorité (pour toujours avoir la dernière version),
// repli sur le cache uniquement si hors-ligne. Les appels Supabase ne sont
// jamais mis en cache, pour que la synchro reste toujours à jour.

var CACHE_NAME = 'glc-cache-v1';
var APP_SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  // Ne jamais intercepter/mettre en cache les appels vers Supabase :
  // la synchro doit toujours passer par le réseau, jamais servir une copie en cache.
  if(url.hostname.indexOf('supabase.co') !== -1) return;

  event.respondWith(
    fetch(req).then(function(networkResponse){
      if(networkResponse && networkResponse.status === 200){
        var responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, responseClone); });
      }
      return networkResponse;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        return cached || caches.match('./index.html');
      });
    })
  );
});
