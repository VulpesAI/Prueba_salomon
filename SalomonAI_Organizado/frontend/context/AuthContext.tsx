"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type {
  AuthResponse,
  AuthTokenResponse,
  Session,
  User,
} from "@supabase/supabase-js"

type AuthUser = {
  id: string
  email: string | null
  name: string
  avatarUrl: string | null
}

type AuthContextType = {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthTokenResponse>
  signup: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<AuthResponse>
  resetPassword: (email: string) => Promise<AuthResponse>
  logout: () => Promise<void>
  refreshSession: () => Promise<Session | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const mapSupabaseUser = (supabaseUser: User | null): AuthUser | null => {
  if (!supabaseUser) {
    return null
  }

  const metadata = supabaseUser.user_metadata ?? {}
  const name =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    supabaseUser.email ||
    ""

  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    name,
    avatarUrl,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        setSession(null)
        setUser(null)
        return null
      }

      const payload = (await response.json()) as {
        session: Session | null
      }

      const nextSession = payload.session ?? null
      setSession(nextSession)
      setUser(mapSupabaseUser(nextSession?.user ?? null))

      return nextSession
    } catch (error) {
      console.error("Failed to refresh Supabase session", error)
      setSession(null)
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      try {
        await refreshSession()
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      isMounted = false
    }
  }, [refreshSession])

  const login = useCallback<AuthContextType["login"]>(async (email, password) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const payload = (await response.json()) as AuthTokenResponse & {
      error?: string
    }

    if (!response.ok || payload.error) {
      throw new Error(
        payload.error ?? "No pudimos iniciar sesión. Inténtalo nuevamente."
      )
    }

    const nextSession = payload.data.session ?? null
    setSession(nextSession)
    setUser(mapSupabaseUser(payload.data.user ?? null))

    return payload
  }, [])

  const signup = useCallback<AuthContextType["signup"]>(
    async (email, password, displayName) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      })

      const payload = (await response.json()) as AuthResponse & {
        error?: string
      }

      if (!response.ok || payload.error) {
        throw new Error(
          payload.error ?? "No pudimos crear la cuenta. Inténtalo nuevamente."
        )
      }

      const nextSession = payload.data.session ?? null
      setSession(nextSession)
      setUser(mapSupabaseUser(payload.data.user ?? null))

      return payload
    },
    []
  )

  const resetPassword = useCallback<AuthContextType["resetPassword"]>(
    async (email) => {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      })

      const payload = (await response.json()) as AuthResponse & {
        error?: string
      }

      if (!response.ok || payload.error) {
        throw new Error(
          payload.error ??
            "No pudimos enviar el correo de recuperación. Inténtalo nuevamente."
        )
      }

      return payload
    },
    []
  )

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/session", {
      method: "DELETE",
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }

      throw new Error(payload.error ?? "No pudimos cerrar sesión")
    }

    setSession(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      login,
      signup,
      resetPassword,
      logout,
      refreshSession,
    }),
    [isLoading, login, logout, refreshSession, resetPassword, session, signup, user]
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

export type { AuthUser }
