const STORAGE_KEY = 'chat:tts-enabled';

export function getTtsPreference(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return null;
  }
  return stored === 'true';
}

export function setTtsPreference(value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
}
