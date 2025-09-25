'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface AuthContextValue {
  token: string | null;
  userEmail: string | null;
  setAuth: (token: string, email: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('salomon.token') : null;
    const storedEmail = typeof window !== 'undefined' ? window.localStorage.getItem('salomon.email') : null;

    if (storedToken) {
      setToken(storedToken);
    }
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
    setIsLoading(false);
  }, []);

  const setAuth = useCallback((newToken: string, email: string) => {
    setToken(newToken);
    setUserEmail(email);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('salomon.token', newToken);
      window.localStorage.setItem('salomon.email', email);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserEmail(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('salomon.token');
      window.localStorage.removeItem('salomon.email');
    }
  }, []);

  const value = useMemo(
    () => ({ token, userEmail, setAuth, logout, isLoading }),
    [token, userEmail, setAuth, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
