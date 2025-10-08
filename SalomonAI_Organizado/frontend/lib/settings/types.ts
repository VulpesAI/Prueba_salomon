export type VoiceOption = 'alloy' | 'ash' | 'nova';
export type ThemeOption = 'dark' | 'light';

export type SettingsDTO = {
  voice: VoiceOption;
  theme: ThemeOption;
  updatedAt: string; // ISO8601
};

export type SettingsFormState = {
  voice: VoiceOption;
  theme: ThemeOption;
};
