import { useSettings } from '@/lib/settings/context';

export function useTheme() {
  const { settings, setTheme } = useSettings();

  return {
    theme: settings.theme,
    setTheme,
  } as const;
}
