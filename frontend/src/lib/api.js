import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Fast Client-side In-memory Cache
const cache = new Map();
const DEFAULT_TTL = 30000; // 30s cache for fast zero-wait responses

export const clearApiCache = (urlPrefix = '') => {
  if (!urlPrefix) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.includes(urlPrefix)) cache.delete(key);
    }
  }
};

// Attach JWT token to every request and auto-invalidate cache on data modifications
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Invalidate cached GET queries when modifications are made
    clearApiCache();
  }

  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    // Let the browser set the correct multipart Content-Type boundary
    delete config.headers['Content-Type'];
  }

  return config;
});

// Handle 401 — auto logout and unwrap success data
api.interceptors.response.use(
  (response) => {
    // Automatically unwrap the standard backend wrapper { success: true, data: ... }
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

/**
 * Fast cached GET helper: Returns cached data immediately (0ms wait)
 * with background revalidation.
 */
api.getCached = async (url, config = {}, ttl = DEFAULT_TTL) => {
  const key = `${url}_${JSON.stringify(config.params || {})}`;
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttl) {
    // Return cached response instantly
    return Promise.resolve(cached.response);
  }

  const promise = api.get(url, config).then((res) => {
    cache.set(key, { timestamp: Date.now(), response: res });
    return res;
  });

  return promise;
};

export default api;
