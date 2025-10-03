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

import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"

type ResetPasswordForEmailResponse = Awaited<
  ReturnType<typeof supabase.auth.resetPasswordForEmail>
>

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
  resetPassword: (email: string) => Promise<ResetPasswordForEmailResponse>
  resetPassword: (email: string) => Promise<void>
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
  const router = useRouter()

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const hash = window.location.hash
    if (!hash || !hash.includes("access_token")) {
      return
    }

    const params = new URLSearchParams(hash.slice(1))
    const type = params.get("type")
    if (!type || !["signup", "magiclink", "recovery", "invite"].includes(type)) {
      return
    }

    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    if (!accessToken || !refreshToken) {
      return
    }

    let isMounted = true

    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          throw error
        }

        let redirectTo = "/dashboard/overview"
        const redirectParam = params.get("redirect_to")
        if (redirectParam) {
          try {
            const redirectUrl = new URL(redirectParam, window.location.origin)
            if (redirectUrl.origin === window.location.origin) {
              redirectTo = `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
            }
          } catch {
            // Ignore invalid redirect values and fall back to the default path
          }
        }

        if (isMounted) {
          router.replace(redirectTo)
        }
      } catch (error) {
        console.error("Failed to handle Supabase auth callback", error)
      } finally {
        if (isMounted) {
          window.history.replaceState(
            {},
            document.title,
            `${window.location.pathname}${window.location.search}`
          )
        }
      }
    }

    void handleAuthCallback()

    return () => {
      isMounted = false
    }
  }, [router])

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      })

      if (error) {
        throw error
      }
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
