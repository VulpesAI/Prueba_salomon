"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_THEMES: Theme[] = ['dark', 'light'];

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

const sanitizeStoredTheme = (
  storedTheme: string | null,
  fallback: Theme,
  storageKey: string
): Theme => {
  if (storedTheme && STORAGE_THEMES.includes(storedTheme as Theme)) {
    return storedTheme as Theme;
  }

  if (storedTheme === 'system' && typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, fallback);
  }

  return fallback;
};

const applyThemeToRoot = (nextTheme: Theme) => {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(nextTheme);
  root.style.colorScheme = nextTheme;
};

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'salomonai-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = window.localStorage.getItem(storageKey);
    const initialTheme = sanitizeStoredTheme(
      storedTheme,
      defaultTheme,
      storageKey
    );

    applyThemeToRoot(initialTheme);
    setThemeState(initialTheme);
  }, [defaultTheme, storageKey]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (typeof window === 'undefined') return;

      window.localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
      applyThemeToRoot(newTheme);
    },
    [storageKey]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [setTheme, theme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
