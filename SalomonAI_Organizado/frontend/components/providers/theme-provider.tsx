"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type Theme = 'dark' | 'light';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'salomonai-theme',
  ...props
}: ThemeProviderProps) {
  const getInitialTheme = useCallback(
    () => {
      if (typeof window === 'undefined') {
        return defaultTheme;
      }

      const storedTheme = window.localStorage.getItem(storageKey);

      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }

      if (storedTheme === 'system') {
        window.localStorage.setItem(storageKey, defaultTheme);
      }

      return defaultTheme;
    },
    [defaultTheme, storageKey]
  );

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, newTheme);
      }
      setThemeState(newTheme);
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
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
