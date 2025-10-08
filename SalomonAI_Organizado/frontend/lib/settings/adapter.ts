'use client';
import { SettingsDTO, SettingsFormState } from './types';
import { SettingsSchema } from './schema';
import { loadLocalSettings, saveLocalSettings } from './storage';
import { applyTheme } from '../theme/applyTheme';

const USE_LOCAL_ADAPTER = false; // si true, no hace fetch y opera sólo con localStorage

const DEFAULTS: SettingsDTO = {
  voice: 'alloy',
  theme: 'dark',
  updatedAt: new Date().toISOString()
};

export async function getSettings(): Promise<SettingsDTO> {
  if (USE_LOCAL_ADAPTER) {
    const local = loadLocalSettings();
    const dto = { ...DEFAULTS, ...local, updatedAt: new Date().toISOString() };
    const parsed = SettingsSchema.parse(dto);
    applyTheme(parsed.theme);
    return parsed;
  }
  const res = await fetch('/api/settings', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar settings');
  const data = await res.json();
  const parsed = SettingsSchema.parse(data);
  saveLocalSettings(parsed);
  applyTheme(parsed.theme);
  return parsed;
}

export async function updateSettings(input: SettingsFormState): Promise<SettingsDTO> {
  const next: SettingsDTO = {
    voice: input.voice,
    theme: input.theme,
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
  if (!res.ok) throw new Error('No se pudo actualizar settings');
  const data = await res.json();
  const parsed = SettingsSchema.parse(data);
  saveLocalSettings(parsed);
  applyTheme(parsed.theme);
  return parsed;
}
