export type VoiceOption = 'alloy' | 'ash' | 'nova';
export type ThemeOption = 'dark' | 'light';

export type SettingsDTO = {
  voice: VoiceOption;
  theme: ThemeOption;
  language: string; // ej: 'es-CL'
  timeZone: string; // ej: 'America/Santiago'
  currency: 'CLP';
  updatedAt: string; // ISO8601
};

export type SettingsFormState = {
  voice: VoiceOption;
  theme: ThemeOption;
  language: string;
  timeZone: string;
  // currency no se edita en UI, siempre CLP
};
