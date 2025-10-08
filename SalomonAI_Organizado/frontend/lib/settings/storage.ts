export const LS_KEYS = {
  SETTINGS: 'salomonai:settings',
} as const;

export function loadSettings<T>(fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(LS_KEYS.SETTINGS);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveSettings<T>(value: T) {
  try {
    window.localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(value));
  } catch {
    // no-op
  }
}
