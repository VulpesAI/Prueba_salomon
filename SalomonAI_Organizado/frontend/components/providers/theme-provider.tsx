"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";
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
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

const AVAILABLE_THEMES = new Set<Theme>(["dark", "light"]);

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const resolveStoredTheme = (
  storageKey: string,
  fallback: Theme,
): Theme => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedTheme = window.localStorage.getItem(storageKey);
  if (storedTheme && AVAILABLE_THEMES.has(storedTheme as Theme)) {
    return storedTheme as Theme;
  }

  if (storedTheme === "system") {
    window.localStorage.setItem(storageKey, fallback);
  }

  return fallback;
};

const applyThemeToDocument = (theme: Theme) => {
  if (typeof window === "undefined") {
    return;
  }

  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "salomonai-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useIsomorphicLayoutEffect(() => {
    const initialTheme = resolveStoredTheme(storageKey, defaultTheme);
    applyThemeToDocument(initialTheme);
    setThemeState(initialTheme);
  }, [defaultTheme, storageKey]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(storageKey, nextTheme);
      applyThemeToDocument(nextTheme);
      setThemeState(nextTheme);
    },
    [storageKey],
  );

  const value = useMemo<ThemeProviderState>(
  undefined
);

const STORAGE_THEMES: Theme[] = ['dark', 'light'];

const sanitizeStoredTheme = (
  storedTheme: string | null,
  fallback: Theme,
  storageKey: string
): Theme => {
  if (storedTheme && STORAGE_THEMES.includes(storedTheme as Theme)) {
    return storedTheme as Theme;
  }

  if (storedTheme === 'system') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, fallback);
    }
  }

  return fallback;
const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
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
  ...props
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
      applyThemeToRoot(newTheme);
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
    [theme, setTheme],
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

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
