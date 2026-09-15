import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/types/api';

const STORAGE_KEY = 'fanitt_auth';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean; // true once we've checked localStorage / called /auth/me on boot
}

function loadPersisted(): { user: AuthUser | null; accessToken: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null };
  }
}

const persisted = loadPersisted();

const initialState: AuthState = {
  user: persisted.user,
  accessToken: persisted.accessToken,
  isAuthenticated: Boolean(persisted.accessToken && persisted.user),
  hasHydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: AuthUser | null; accessToken: string }>) {
      state.user = action.payload.user ?? state.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = Boolean(state.user && state.accessToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, accessToken: state.accessToken }));
    },
    updateUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (!state.user) return;
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, accessToken: state.accessToken }));
    },
    setHydrated(state) {
      state.hasHydrated = true;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { setCredentials, updateUser, setHydrated, logout } = authSlice.actions;
export default authSlice.reducer;
