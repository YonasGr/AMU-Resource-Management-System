import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
function resolveApiBase(): string {
  const envUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  }
  // When running in Railway production environment
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    return 'https://amu-backend-production-65db.up.railway.app';
  }
  return '/api';
}

export const apiBase = resolveApiBase();

export const api = axios.create({
  baseURL: apiBase,
});

// Attach the current access token to every outgoing request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status !== 401 || !original || original._retried || original.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    const { refreshToken, setSession, clearSession } = useAuthStore.getState();
    if (!refreshToken) {
      clearSession();
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      const refreshUrl = `${apiBase}/auth/refresh`.replace(/([^:]\/)\/+/g, '$1');
      const response = await axios.post(refreshUrl, { refreshToken });
      const data = response.data.data ?? response.data;
      setSession({ ...data, user: useAuthStore.getState().user });
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      clearSession();
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  },
);
