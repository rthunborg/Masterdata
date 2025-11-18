// Service Worker for HR Masterdata PWA
// Cache version - increment on deploy
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `hr-masterdata-${CACHE_VERSION}`;

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  EMPLOYEE_LIST: 5 * 60 * 1000, // 5 minutes
  EMPLOYEE_DETAIL: 60 * 1000, // 1 minute
  STATIC_ASSETS: Infinity, // Static assets cached indefinitely
};

// Routes that should be cached with NetworkFirst strategy
const API_ROUTES = [
  '/api/employees',
  '/api/important-dates',
  '/api/columns',
];

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Failed to cache some assets:', err);
      });
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== `${CACHE_NAME}-metadata`) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // NetworkFirst strategy for API routes
  if (isApiRoute(url.pathname)) {
    event.respondWith(networkFirstStrategy(request, url.pathname));
    return;
  }
  
  // CacheFirst strategy for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // NetworkFirst for HTML pages (with cache fallback)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, url.pathname));
    return;
  }
  
  // Default: network only
  event.respondWith(fetch(request));
});

/**
 * Check if URL is an API route
 */
function isApiRoute(pathname) {
  return API_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
  );
}

/**
 * NetworkFirst strategy: Try network, fallback to cache
 * Used for API calls and HTML pages
 */
async function networkFirstStrategy(request, pathname) {
  const cache = await caches.open(CACHE_NAME);
  const metadataCache = await caches.open(`${CACHE_NAME}-metadata`);
  
  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.ok) {
      const clonedResponse = response.clone();
      
      // Determine TTL based on route
      let ttl = CACHE_TTL.EMPLOYEE_DETAIL;
      if (pathname.includes('/api/employees') && !pathname.match(/\/api\/employees\/\d+/)) {
        ttl = CACHE_TTL.EMPLOYEE_LIST;
      }
      
      // Store response in cache
      await cache.put(request, clonedResponse);
      
      // Store metadata separately for TTL checking
      const metadataUrl = new URL(request.url);
      metadataUrl.searchParams.set('_sw_metadata', 'true');
      const metadataRequest = new Request(metadataUrl.toString());
      await metadataCache.put(metadataRequest, new Response(JSON.stringify({
        timestamp: Date.now(),
        ttl: ttl,
      })));
    }
    
    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    
    // Try to get from cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check TTL
      const metadataUrl = new URL(request.url);
      metadataUrl.searchParams.set('_sw_metadata', 'true');
      const metadataRequest = new Request(metadataUrl.toString());
      const metadataResponse = await metadataCache.match(metadataRequest);
      
      if (metadataResponse) {
        const metadata = await metadataResponse.json();
        const age = Date.now() - metadata.timestamp;
        
        if (age < metadata.ttl) {
          // Cache is still valid
          return cachedResponse;
        } else {
          // Cache expired, delete it
          await cache.delete(request);
          await metadataCache.delete(metadataRequest);
        }
      } else {
        // No metadata, return cached response (legacy or static asset)
        return cachedResponse;
      }
    }
    
    // No cache available, return error response
    return new Response('Network error and no cache available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * CacheFirst strategy: Try cache, fallback to network
 * Used for static assets
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[Service Worker] Failed to fetch:', request.url, error);
    return new Response('Asset not available', {
      status: 404,
      statusText: 'Not Found',
    });
  }
}

/**
 * Message handler for cache management
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

