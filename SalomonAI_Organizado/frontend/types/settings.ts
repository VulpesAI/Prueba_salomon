import type { ThemeOption, VoiceOption } from '@/lib/settings/types';

export type VoiceId = VoiceOption;

export interface SettingsState {
  voice: VoiceId;
  theme: ThemeOption;
}

export const DEFAULT_SETTINGS: SettingsState = {
  voice: 'alloy',
  theme: 'dark',
};
