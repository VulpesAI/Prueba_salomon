const KEY = 'salomon.settings';

export function loadLocalSettings(): Partial<import('./types').SettingsDTO> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveLocalSettings(dto: import('./types').SettingsDTO) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(dto));
}
