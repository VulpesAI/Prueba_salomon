'use client';
import { SettingsDTO, SettingsFormState } from './types';
import { SettingsSchema } from './schema';
import { loadLocalSettings, saveLocalSettings } from './storage';
import { applyTheme } from '../theme/applyTheme';

const USE_LOCAL_ADAPTER = false;

function deviceDefaults() {
  const language = typeof navigator !== 'undefined' ? navigator.language || 'es-CL' : 'es-CL';
  const timeZone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago'
    : 'America/Santiago';
  return { language, timeZone };
}

const DEFAULTS: SettingsDTO = {
  voice: 'alloy',
  theme: 'dark',
  ...deviceDefaults(),
  currency: 'CLP',
  updatedAt: new Date().toISOString()
};

export async function getSettings(): Promise<SettingsDTO> {
  if (USE_LOCAL_ADAPTER) {
    const local = loadLocalSettings() ?? {};
    const dto = { ...DEFAULTS, ...local, updatedAt: new Date().toISOString() };
    const parsed = SettingsSchema.parse(dto);
    applyTheme(parsed.theme);
    return parsed;
  }
  const res = await fetch('/api/settings', { cache: 'no-store' });
  const data = res.ok ? await res.json() : DEFAULTS;
  const merged = { ...DEFAULTS, ...data };
  const parsed = SettingsSchema.parse(merged);
  saveLocalSettings(parsed);
  applyTheme(parsed.theme);
  return parsed;
}

export async function updateSettings(input: SettingsFormState): Promise<SettingsDTO> {
  const next: SettingsDTO = {
    voice: input.voice,
    theme: input.theme,
    language: input.language,
    timeZone: input.timeZone,
    currency: 'CLP',
    updatedAt: new Date().toISOString()
  };

  if (USE_LOCAL_ADAPTER) {
    saveLocalSettings(next);
    applyTheme(next.theme);
    return SettingsSchema.parse(next);
  }

  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next)
  });
  const data = res.ok ? await res.json() : next;
  const parsed = SettingsSchema.parse(data);
  saveLocalSettings(parsed);
  applyTheme(parsed.theme);
  return parsed;
}
