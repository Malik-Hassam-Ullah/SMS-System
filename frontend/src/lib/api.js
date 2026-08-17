import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request and preserve multipart uploads
api.interceptors.request.use((config) => {
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
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      const originalData = response.data;
      response.data = originalData.data;
      if (originalData.pagination) {
        response.pagination = originalData.pagination;
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
