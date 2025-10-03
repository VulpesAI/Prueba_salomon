"use client"

import { createContext, useContext, useMemo } from "react"

export type AuthUser = {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
}

type AuthContextType = {
  user: AuthUser
  backendUser: AuthUser
  session: null
  isLoading: false
  isAuthDisabled: boolean
  login: (email: string, password: string) => void
  signup: (email: string, password: string, displayName?: string) => void
  loginWithGoogle: () => void
  resetPassword: (email: string) => void
  logout: () => void
}

const DEMO_USER: AuthUser = {
  id: "demo-user",
  email: "demo@example.com",
  name: "Demo User",
  avatarUrl: null,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<AuthContextType>(
    () => ({
      user: DEMO_USER,
      backendUser: { ...DEMO_USER },
      session: null,
      isLoading: false,
      isAuthDisabled: false,
      login: () => {},
      signup: () => {},
      loginWithGoogle: () => {},
      resetPassword: () => {},
      logout: () => {},
    }),
    []
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
