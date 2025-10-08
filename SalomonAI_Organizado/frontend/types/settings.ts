import type { ThemeOption, VoiceOption } from '@/lib/settings/types';

export type VoiceId = VoiceOption;

export interface SettingsState {
  voice: VoiceId;
  theme: ThemeOption;
  language: string;
  timeZone: string;
}

export const DEFAULT_SETTINGS: SettingsState = {
  voice: 'alloy',
  theme: 'dark',
  language: 'es-CL',
  timeZone: 'America/Santiago',
};
