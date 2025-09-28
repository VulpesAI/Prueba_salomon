"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { apiRequest, ApiError } from "@/lib/api-client"

export type AuthenticatedUser = {
  id: string
  email: string
  fullName?: string | null
  displayName?: string | null
  roles?: string[]
  createdAt?: string
  updatedAt?: string
}

type RegisterPayload = {
  fullName: string
  email: string
  password: string
}

type AuthContextType = {
  user: AuthenticatedUser | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const TOKEN_STORAGE_KEY = "salomonai_token"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const persistToken = useCallback((newToken: string | null) => {
    if (typeof window === "undefined") return
    if (newToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
    setToken(newToken)
  }, [])

  const fetchUserProfile = useCallback(async (authToken: string) => {
    const profile = await apiRequest<AuthenticatedUser>("/users/me", {
      token: authToken,
      method: "GET",
    })
    setUser(profile)
  }, [])

  const checkStoredSession = useCallback(async () => {
    if (typeof window === "undefined") return

    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    try {
      await fetchUserProfile(storedToken)
      setToken(storedToken)
    } catch (error) {
      console.warn("No se pudo validar la sesión almacenada", error)
      persistToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [fetchUserProfile, persistToken])

  useEffect(() => {
    checkStoredSession()
  }, [checkStoredSession])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await apiRequest<{ access_token: string }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        })

        persistToken(response.access_token)
        await fetchUserProfile(response.access_token)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(error.message || "Error al iniciar sesión")
        }
        throw error instanceof Error ? error : new Error("Error al iniciar sesión")
      }
    },
    [fetchUserProfile, persistToken]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      try {
        await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: payload.email,
            password: payload.password,
            fullName: payload.fullName,
          }),
        })

        await login(payload.email, payload.password)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(error.message || "No se pudo crear la cuenta")
        }
        throw error instanceof Error ? error : new Error("No se pudo crear la cuenta")
      }
    },
    [login]
  )

  const logout = useCallback(() => {
    persistToken(null)
    setUser(null)
  }, [persistToken])

  const refreshUser = useCallback(async () => {
    if (!token) return
    await fetchUserProfile(token)
  }, [fetchUserProfile, token])

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await apiRequest("/auth/password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new Error(
          "La recuperación de contraseña aún no está disponible. Escríbenos a soporte@salomonai.cl para recibir ayuda."
        )
      }
      throw error instanceof Error
        ? error
        : new Error("No se pudo solicitar el restablecimiento de contraseña")
    }
  }, [])

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout, refreshUser, sendPasswordReset }),
    [user, token, isLoading, login, register, logout, refreshUser, sendPasswordReset]
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
