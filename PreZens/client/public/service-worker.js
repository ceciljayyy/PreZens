// PreZens Service Worker

const CACHE_NAME = 'prezens-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests (don't cache them)
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return from cache if available
        if (response) {
          return response;
        }
        
        // Clone the request - request streams can only be used once
        const fetchRequest = event.request.clone();
        
        // Make network request
        return fetch(fetchRequest)
          .then((response) => {
            // Check for valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response - response streams can only be used once
            const responseToCache = response.clone();
            
            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback for 404 pages
            if (event.request.url.includes('.html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle background sync for offline check-ins
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-check-ins') {
    event.waitUntil(syncCheckIns());
  }
});

// Function to sync stored check-ins when back online
async function syncCheckIns() {
  try {
    const db = await openDB();
    const pendingCheckIns = await db.getAll('pending-check-ins');
    
    if (pendingCheckIns.length === 0) return;
    
    // Process each pending check-in
    for (const checkIn of pendingCheckIns) {
      try {
        const response = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(checkIn.data)
        });
        
        if (response.ok) {
          // Remove from pending if successful
          await db.delete('pending-check-ins', checkIn.id);
          
          // Send notification
          self.registration.showNotification('PreZens - Check-in Synced', {
            body: `Your check-in for ${checkIn.meetingName} has been synced.`,
            icon: '/assets/icon-192.svg'
          });
        }
      } catch (error) {
        console.error('Error syncing check-in:', error);
      }
    }
  } catch (error) {
    console.error('Error in sync operation:', error);
  }
}

// Simple indexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PreZensOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-check-ins')) {
        db.createObjectStore('pending-check-ins', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
