import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000`;
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

const API_URL = getApiBaseUrl();

export const rawApi = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Fast In-Memory & Session Stale-While-Revalidate (SWR) Cache ─────────
const memoryCache = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60s cache TTL

// Helper to generate unique cache key
const getCacheKey = (url, params = {}) => {
  return `${url}__${JSON.stringify(params || {})}`;
};

// Try loading from session cache on warm boot
const getSessionCached = (key) => {
  try {
    const item = sessionStorage.getItem(`sms_cache_${key}`);
    if (item) {
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp < DEFAULT_TTL_MS * 2) {
        return parsed.data;
      }
    }
  } catch (_) {}
  return null;
};

const setSessionCached = (key, data) => {
  try {
    sessionStorage.setItem(
      `sms_cache_${key}`,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (_) {}
};

export const clearApiCache = (urlPrefix = '') => {
  if (!urlPrefix) {
    memoryCache.clear();
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('sms_cache_')) sessionStorage.removeItem(k);
      });
    } catch (_) {}
  } else {
    for (const key of memoryCache.keys()) {
      if (key.includes(urlPrefix)) memoryCache.delete(key);
    }
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('sms_cache_') && k.includes(urlPrefix)) {
          sessionStorage.removeItem(k);
        }
      });
    } catch (_) {}
  }
};

// Attach JWT token to every request and auto-invalidate cache on data modifications
rawApi.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Invalidate cached GET queries when modifications are made
    clearApiCache();
  }

  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Handle 401 & unwrap data
rawApi.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      !(response.data instanceof Blob) &&
      'success' in response.data &&
      'data' in response.data
    ) {
      const originalData = response.data;
      response.data = originalData.data;
      if (originalData.pagination) {
        response.pagination = originalData.pagination;
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Ultra-Fast Instant Zero-Wait API Wrapper ──────────────────────────
export const api = {
  ...rawApi,

  // Enhanced instant GET: returns cached data in 0ms, revalidates in background
  get: async (url, config = {}) => {
    const skipCache = config?.skipCache === true || url.includes('/auth/status');
    const key = getCacheKey(url, config?.params);
    const now = Date.now();

    if (!skipCache) {
      // 1. Check in-memory cache
      const inMemory = memoryCache.get(key);
      if (inMemory && now - inMemory.timestamp < DEFAULT_TTL_MS) {
        // Background silent revalidation after 10s if stale
        if (now - inMemory.timestamp > 10000) {
          rawApi.get(url, { ...config, skipCache: true }).then((freshRes) => {
            memoryCache.set(key, { timestamp: Date.now(), response: freshRes });
            setSessionCached(key, freshRes);
          }).catch(() => {});
        }
        return Promise.resolve(inMemory.response);
      }

      // 2. Check session cache
      const sessionData = getSessionCached(key);
      if (sessionData) {
        memoryCache.set(key, { timestamp: now, response: sessionData });
        // Background silent revalidation
        rawApi.get(url, { ...config, skipCache: true }).then((freshRes) => {
          memoryCache.set(key, { timestamp: Date.now(), response: freshRes });
          setSessionCached(key, freshRes);
        }).catch(() => {});
        return Promise.resolve(sessionData);
      }
    }

    // 3. Fallback: Network fetch and store in cache
    const response = await rawApi.get(url, config);
    memoryCache.set(key, { timestamp: Date.now(), response });
    setSessionCached(key, response);
    return response;
  },

  post: (url, data, config) => rawApi.post(url, data, config),
  put: (url, data, config) => rawApi.put(url, data, config),
  delete: (url, config) => rawApi.delete(url, config),
  patch: (url, data, config) => rawApi.patch(url, data, config),

  getCached: async (url, config = {}) => {
    return api.get(url, config);
  },

  // Prefetch endpoint in background during idle / hover
  prefetch: (url, config = {}) => {
    try {
      const key = getCacheKey(url, config?.params);
      if (!memoryCache.has(key)) {
        rawApi.get(url, config).then((res) => {
          memoryCache.set(key, { timestamp: Date.now(), response: res });
          setSessionCached(key, res);
        }).catch(() => {});
      }
    } catch (_) {}
  },
};

export default api;
