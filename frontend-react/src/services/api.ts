import axios from 'axios';
import type { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

export type LaravelPage<T> = {
  data: T[];
  links?: unknown;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export type ValidationErrors = Record<string, string[]>;

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}

export function getValidationErrors(error: unknown): ValidationErrors | null {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error) && error.response?.status === 422) {
    return toValidationErrors(error.response.data.errors);
  }

  return null;
}

function toValidationErrors(errors: unknown): ValidationErrors | null {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return null;
  }

  return Object.entries(errors).reduce<ValidationErrors>((carry, [field, messages]) => {
    if (Array.isArray(messages)) {
      carry[field] = messages.map(String);
    } else if (typeof messages === 'string') {
      carry[field] = [messages];
    }

    return carry;
  }, {});
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

export async function apiPage<T>(url: string, params?: Record<string, unknown>) {
  return apiGet<LaravelPage<T>>(url, params);
}

export function toRows<T>(payload: T[] | LaravelPage<T> | undefined | null): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}
