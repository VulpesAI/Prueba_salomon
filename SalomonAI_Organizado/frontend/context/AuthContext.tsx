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

import { supabase } from "@/lib/supabase"

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
  resetPassword: (
    email: string
  ) => ReturnType<typeof supabase.auth.resetPasswordForEmail>
  logout: () => Promise<void>
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

  useEffect(() => {
    let isMounted = true

    const syncSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          throw error
        }

        if (!isMounted) return

        setSession(data.session)
        setUser(mapSupabaseUser(data.session?.user ?? null))
      } catch (error) {
        console.error("Failed to retrieve Supabase session", error)
        if (!isMounted) return
        setSession(null)
        setUser(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return

      setSession(currentSession)
      setUser(mapSupabaseUser(currentSession?.user ?? null))
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback<AuthContextType["login"]>(async (email, password) => {
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (response.error) {
      throw response.error
    }

    return response
  }, [])

  const signup = useCallback<AuthContextType["signup"]>(
    async (email, password, displayName) => {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { full_name: displayName } : undefined,
        },
      })

      if (response.error) {
        throw response.error
      }

      return response
    },
    []
  )

  const resetPassword = useCallback<AuthContextType["resetPassword"]>(
    async (email) => {
      const response = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      })

      if (response.error) {
        throw response.error
      }

      return response
    },
    []
  )

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
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
    }),
    [isLoading, login, logout, resetPassword, session, signup, user]
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
