// File: src/hooks/useAuth.ts  (fanitt-admin)
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials, logout as logoutAction } from '@/store/slices/authSlice';
import { authApi, isOtpChallenge, type OtpChallenge } from '@/services/authApi';
import type { AuthUser } from '@/types/api';

/** Signed in, or a code is needed first. */
export type LoginOutcome = { user: AuthUser } | { otp: OtpChallenge };

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated, hasHydrated } = useAppSelector((s) => s.auth);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const data = await authApi.login(email, password);
      if (isOtpChallenge(data)) return { otp: data };
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      return { user: data.user };
    },
    [dispatch]
  );

  const verifyCode = useCallback(
    async (challenge: string, code: string) => {
      const data = await authApi.verifyCode(challenge, code);
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      return data.user;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      dispatch(logoutAction());
      navigate('/login');
    }
  }, [dispatch, navigate]);

  return { user, accessToken, isAuthenticated, hasHydrated, login, verifyCode, logout };
}