import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../../types';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

function savedUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user') ?? 'null') as AuthUser | null;
  } catch {
    localStorage.removeItem('auth_user');
    return null;
  }
}

const initialState: AuthState = {
  token: localStorage.getItem('auth_token'),
  user: savedUser(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('auth_token', action.payload.token);
      localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
    },
    clearCredentials(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
