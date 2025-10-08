export type VoiceId = 'alloy' | 'ash' | 'nova' | 'verse' | 'sonora';

export interface SettingsState {
  voice: VoiceId;
  theme: 'light' | 'dark';
}

export const DEFAULT_SETTINGS: SettingsState = {
  voice: 'alloy',
  theme: 'dark',
};
