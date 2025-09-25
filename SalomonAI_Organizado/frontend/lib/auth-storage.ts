const TOKEN_KEY = 'token';

const isBrowser = () => typeof window !== 'undefined';

export const getTokenFromCookies = (): string | null => {
  if (!isBrowser()) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const getAuthToken = (): string | null => {
  if (!isBrowser()) return null;
  const fromStorage = window.localStorage.getItem(TOKEN_KEY);
  if (fromStorage) return fromStorage;
  return getTokenFromCookies();
};

export const storeAuthToken = (token: string) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  const isSecure = window.location.protocol === 'https:';
  const maxAge = 60 * 60 * 24; // 24 horas
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; samesite=lax${isSecure ? '; secure' : ''}`;
};

export const clearAuthToken = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
};
