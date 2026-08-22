// ─── High-Speed In-Memory Server Cache ─────────────────────────────────────
// Caches read requests in RAM for ultra-fast (1-2ms) response times.
// Automatically invalidates when any data modification (POST, PUT, DELETE, PATCH) occurs.

const memoryCache = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds TTL

function getCacheKey(req) {
  const userId = req.user?.id || 'anon';
  const branchId = req.user?.branch_id || req.headers['x-branch-id'] || 'all';
  return `${branchId}:${userId}:${req.method}:${req.originalUrl}`;
}

function clearCache(pattern = '') {
  if (!pattern) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  }
}

// Caching middleware for Express
function apiCacheMiddleware(ttlMs = DEFAULT_TTL_MS) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      // Invalidate cache on mutations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const branchId = req.user?.branch_id || req.headers['x-branch-id'] || '';
        clearCache(branchId);
      }
      return next();
    }

    // Skip caching for auth token exchange or health endpoints
    if (req.originalUrl.includes('/auth/login') || req.originalUrl.includes('/auth/refresh') || req.originalUrl.includes('/whatsapp/status')) {
      return next();
    }

    const key = getCacheKey(req);
    const cached = memoryCache.get(key);
    const now = Date.now();

    if (cached && now < cached.expiry) {
      res.setHeader('X-Server-Cache', 'HIT');
      return res.json(cached.body);
    }

    // Intercept res.json to store into memory cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful JSON responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, {
          body,
          expiry: now + ttlMs,
        });
        res.setHeader('X-Server-Cache', 'MISS');
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = {
  apiCacheMiddleware,
  clearCache,
};
