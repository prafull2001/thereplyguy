// Service Worker for cache management
const CACHE_NAME = 'replyguy-v' + Date.now()
const urlsToCache = [
  '/',
  '/fonts/Mulish-Regular.ttf',
  '/fonts/Mulish-Medium.ttf',
  '/fonts/Mulish-SemiBold.ttf',
  '/fonts/Mulish-Bold.ttf',
  '/replyguylogo.png'
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('replyguy-v')) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, but always try network first for HTML
self.addEventListener('fetch', (event) => {
  // For HTML pages, always try network first
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network succeeds, update cache and return response
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request)
        })
    )
  } else {
    // For assets, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request)
        })
    )
  }
})