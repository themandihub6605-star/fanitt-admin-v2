// File: src/services/authApi.ts  (fanitt-admin)
import { apiClient } from './apiClient';
import type { ApiEnvelope, AuthUser } from '@/types/api';

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

/** Step 2 of an admin login: a 6-digit code was emailed. */
export interface OtpChallenge {
  otpRequired: true;
  challenge: string;
  email: string;
}

export type LoginResult = AuthResponse | OtpChallenge;

export const isOtpChallenge = (r: LoginResult): r is OtpChallenge => (r as OtpChallenge).otpRequired === true;

/** Admin Panel auth — email + password (+ a code sent to the admin's email
 * when 2-step login is on). No Google sign-in for admins. */
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiEnvelope<LoginResult>>('/auth/login', { email, password }).then((r) => r.data.data),

  verifyCode: (challenge: string, code: string) =>
    apiClient.post<ApiEnvelope<AuthResponse>>('/auth/admin/verify-code', { challenge, code }).then((r) => r.data.data),

  getMe: () => apiClient.get<ApiEnvelope<AuthUser>>('/auth/me').then((r) => r.data.data),

  logout: () => apiClient.post('/auth/logout'),
};