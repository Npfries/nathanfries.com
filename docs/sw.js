var cacheName = 'pwa-cache'; 
  
var filesToCache = [
    '/',    
    '/index.html',    
    '/scripts/app.js',
    '/styles/dispiro.css',
    '/styles/normalize.css',
    '/styles/style.css',
    '/assets/images/dashboard.jpg',
    '/assets/images/notifications.jpg',
    '/assets/images/workorder-held.jpg'
];  
    
self.addEventListener('install', function(e) { 
    e.waitUntil(
        caches.open(cacheName).then(function(cache) { 
            return cache.addAll(filesToCache);   
        })    
    );  
}); 
    
/* Serve cached content when offline */ 
self.addEventListener('fetch', function(e) {  
    e.respondWith(caches.match(e.request).then(function(response) {  
        return response || fetch(e.request);
    }));  
});