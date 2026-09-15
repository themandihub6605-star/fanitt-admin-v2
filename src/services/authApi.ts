import { apiClient } from './apiClient';
import type { ApiEnvelope, AuthUser } from '@/types/api';

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

/** Admin Panel auth — email + password only, no Google sign-in. Admin
 * accounts are provisioned directly in the database (role: 'admin') with a
 * password, not through self-signup, so this stays deliberately simple. */
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiEnvelope<AuthResponse>>('/auth/login', { email, password }).then((r) => r.data.data),

  getMe: () => apiClient.get<ApiEnvelope<AuthUser>>('/auth/me').then((r) => r.data.data),

  logout: () => apiClient.post('/auth/logout'),
};