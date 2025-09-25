"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api-client";
import { clearAuthToken, getAuthToken, storeAuthToken } from "@/lib/auth-storage";

interface RawUserProfile {
  id: string;
  email: string;
  fullName?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  roles?: string[] | null;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  displayName?: string;
  photoURL?: string;
  roles: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUserProfile = (profile: RawUserProfile): AuthUser => ({
  id: profile.id,
  email: profile.email,
  fullName: profile.fullName ?? undefined,
  displayName: profile.displayName ?? undefined,
  photoURL: profile.photoURL ?? undefined,
  roles: profile.roles ?? ["user"],
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (token: string) => {
    const profile = await apiRequest<RawUserProfile>("/users/profile", { token });
    setUser(mapUserProfile(profile));
  }, []);

  const checkAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      await loadProfile(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthToken();
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const { access_token } = await apiRequest<{ access_token: string }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        storeAuthToken(access_token);
        await loadProfile(access_token);
      } finally {
        setIsLoading(false);
      }
    },
    [loadProfile],
  );

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      await loadProfile(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthToken();
        setUser(null);
      }
      throw error;
    }
  }, [loadProfile]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
