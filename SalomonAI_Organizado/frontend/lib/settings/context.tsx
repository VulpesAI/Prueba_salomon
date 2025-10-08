'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_SETTINGS, type SettingsState, type VoiceId } from '@/types/settings';

import { applyTheme } from '../theme/applyTheme';
import { getSettings, updateSettings } from './adapter';
import type { SettingsFormState, ThemeOption } from './types';

type SettingsContextValue = {
  settings: SettingsState;
  setVoice: (voice: VoiceId) => void;
  setTheme: (theme: ThemeOption) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const dto = await getSettings();
        if (!active) return;
        setSettings({
          voice: dto.voice,
          theme: dto.theme,
          language: dto.language,
          timeZone: dto.timeZone,
        });
      } catch (error) {
        console.error('Failed to load settings', error);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const persist = useCallback((next: SettingsState) => {
    setSettings(next);
    const payload: SettingsFormState = {
      voice: next.voice,
      theme: next.theme,
      language: next.language,
      timeZone: next.timeZone,
    };
    void updateSettings(payload).catch((error) => {
      console.error('Failed to persist settings', error);
    });
  }, []);

  const setVoice = useCallback(
    (voice: VoiceId) => {
      persist({ ...settings, voice });
    },
    [persist, settings],
  );

  const setTheme = useCallback(
    (theme: ThemeOption) => {
      persist({ ...settings, theme });
    },
    [persist, settings],
  );

  const value = useMemo(
    () => ({ settings, setVoice, setTheme }),
    [settings, setVoice, setTheme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
