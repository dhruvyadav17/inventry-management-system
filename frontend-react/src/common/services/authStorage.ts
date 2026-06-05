import type { AuthUser } from '@common/types';

const tokenKey = 'auth_token';
const userKey = 'auth_user';

export const authStorage = {
  token() {
    return localStorage.getItem(tokenKey);
  },

  user() {
    try {
      return JSON.parse(localStorage.getItem(userKey) ?? 'null') as AuthUser | null;
    } catch {
      localStorage.removeItem(userKey);
      return null;
    }
  },

  save(token: string, user: AuthUser) {
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(userKey, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  },
};
