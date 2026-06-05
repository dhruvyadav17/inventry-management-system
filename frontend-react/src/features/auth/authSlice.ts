import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@common/types';
import { authStorage } from '@common/services/authStorage';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

const initialState: AuthState = {
  token: authStorage.token(),
  user: authStorage.user(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      authStorage.save(action.payload.token, action.payload.user);
    },
    clearCredentials(state) {
      state.token = null;
      state.user = null;
      authStorage.clear();
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
