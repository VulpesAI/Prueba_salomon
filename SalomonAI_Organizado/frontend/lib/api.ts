import { ENV } from '@/config/env';

export const API_BASE = ENV.NEXT_PUBLIC_API_BASE_URL || '';
export const USE_INTERNAL = ENV.NEXT_PUBLIC_FRONTEND_USE_INTERNAL_API === 'true';

export function apiUrl(path: string) {
  return USE_INTERNAL ? `/api${path}` : `${API_BASE}${path}`;
}

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  const { supabase } = await import('./supabase');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getJSON<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers: HeadersInit = {
    ...(opts.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(apiUrl(path), {
    ...opts,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  return getJSON<T>(path, { ...init, method: init.method ?? 'GET', cache: init.cache ?? 'no-store' });
}

export async function apiPost<T>(path: string, body: unknown, init: RequestInit = {}): Promise<T> {
  return getJSON<T>(path, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: JSON.stringify(body),
  });
}

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  nextPage: number | null;
};
