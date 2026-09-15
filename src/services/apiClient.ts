import axios, { type AxiosError } from 'axios';
import { store } from '@/store';
import { setCredentials, logout } from '@/store/slices/authSlice';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
    const newToken = res.data?.data?.accessToken;
    if (newToken) {
      store.dispatch(setCredentials({ user: store.getState().auth.user, accessToken: newToken }));
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config) & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      store.dispatch(logout());
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

export function getUploadUrl(relativePath: string) {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  const origin = BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${relativePath}`;
}