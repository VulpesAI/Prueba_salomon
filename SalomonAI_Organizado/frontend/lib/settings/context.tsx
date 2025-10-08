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

import { applyTheme } from './theme';
import { loadSettings, saveSettings } from './storage';

type SettingsContextValue = {
  settings: SettingsState;
  setVoice: (voice: VoiceId) => void;
  setTheme: (theme: 'light' | 'dark') => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings(DEFAULT_SETTINGS));
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const setVoice = useCallback((voice: VoiceId) => {
    setSettings((current) => ({ ...current, voice }));
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    setSettings((current) => ({ ...current, theme }));
  }, []);

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
