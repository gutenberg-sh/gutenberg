import axios, { type AxiosError } from 'axios';

import { env } from '@/env';

export const api = axios.create({
  baseURL: env.VITE_GUTENBERG_INDEXER_URL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
});

export type ApiError = AxiosError<{
  statusCode?: number;
  message?: string | string[];
  error?: string;
}>;

export function api_error_message(error: unknown, fallback = 'Request failed'): string {
  const ax = error as ApiError;
  const data = ax?.response?.data;
  if (data) {
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
  }
  if (ax?.message) return ax.message;
  return fallback;
}
