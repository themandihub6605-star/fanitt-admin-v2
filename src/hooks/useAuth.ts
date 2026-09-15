import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials, logout as logoutAction } from '@/store/slices/authSlice';
import { authApi } from '@/services/authApi';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated, hasHydrated } = useAppSelector((s) => s.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
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

  return { user, accessToken, isAuthenticated, hasHydrated, login, logout };
}