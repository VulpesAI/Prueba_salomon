"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useRouter } from "next/navigation"

import { configureApiClientAuth } from "@/lib/api-client"

import {
  getFirebaseAuth,
  getGoogleAuthProvider,
  type FirebaseAuth,
  type FirebaseAuthProvider,
  type FirebaseUser,
  type FirebaseUserCredential,
} from "@/lib/firebase"

type BackendUser = {
  id: string
  email: string
  roles: string[]
  displayName?: string | null
  fullName?: string | null
  photoURL?: string | null
  preferences?: Record<string, unknown> | null
  [key: string]: unknown
}

type BackendSessionResponse = {
  accessToken?: string
  access_token?: string
  token?: string
  refreshToken?: string
  refresh_token?: string
  tokenType?: string
  token_type?: string
  expiresIn?: number
  expires_in?: number
  expiresAt?: number | string
  refreshTokenExpiresAt?: string
  refresh_token_expires_at?: string
  user: BackendUser
}

const ACCESS_TOKEN_STORAGE_KEY = "salomonai.auth.accessToken"
const REFRESH_TOKEN_STORAGE_KEY = "salomonai.auth.refreshToken"

const GOOGLE_POPUP_ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "La ventana de acceso se cerró antes de completar el inicio de sesión.",
  "auth/cancelled-popup-request":
    "Ya hay una ventana de inicio de sesión activa. Espera a que termine e inténtalo de nuevo.",
  "auth/unauthorized-domain":
    "Este dominio no está autorizado para iniciar sesión con Google.",
  "auth/operation-not-allowed":
    "El inicio de sesión con Google no está habilitado en este proyecto.",
}

const parseBackendErrorMessage = async (
  response: Response
): Promise<string | undefined> => {
  try {
    const data = (await response.clone().json()) as
      | { message?: unknown; error?: unknown }
      | undefined

    if (data && typeof data === "object") {
      const possibleMessage = [data.message, data.error].find(
        (value): value is string => typeof value === "string" && value.length > 0
      )

      if (possibleMessage) {
        return possibleMessage
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to parse backend error JSON", error)
    }
  }

  try {
    const text = await response.clone().text()
    if (text.trim().length > 0) {
      return text
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to read backend error text", error)
    }
  }

  return undefined
}

export type AuthSession = {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresAt: number
  refreshTokenExpiresAt?: string
  backendUser: BackendUser
  firebaseUid: string
}

type AuthContextType = {
  user: FirebaseUser | null
  backendUser: BackendUser | null
  session: AuthSession | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<BackendUser>
  signup: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<BackendUser>
  loginWithGoogle: () => Promise<BackendUser>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<AuthSession | null>(null)

  const sessionRef = useRef<AuthSession | null>(null)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshSessionRef = useRef<() => Promise<void> | null>(null)

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    []
  )

  const normalizedApiBaseUrl = useMemo(
    () => apiBaseUrl.trim().replace(/\/+$/, ""),
    [apiBaseUrl]
  )

  const buildApiUrl = useCallback(
    (path: string) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`
      const trimmedBaseUrl = normalizedApiBaseUrl.replace(/\/+$/, "")

      const baseUrl = /\/api\/v\d+$/i.test(trimmedBaseUrl)
        ? trimmedBaseUrl
        : /\/api$/i.test(trimmedBaseUrl)
          ? `${trimmedBaseUrl}/v1`
          : `${trimmedBaseUrl}/api/v1`

      return `${baseUrl}${normalizedPath}`
    },
    [normalizedApiBaseUrl]
  )

  const emitTelemetryEvent = useCallback(
    (event: string, detail?: Record<string, unknown>) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("telemetry", {
            detail: {
              event,
              ...detail,
            },
          })
        )
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("[telemetry]", event, detail)
      }
    },
    []
  )

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }, [])

  const scheduleRefresh = useCallback(
    (expiresAt: number) => {
      clearRefreshTimer()

      const millisecondsUntilRefresh = Math.max(expiresAt - Date.now() - 60_000, 0)

      if (!Number.isFinite(millisecondsUntilRefresh)) {
        return
      }

      refreshTimeoutRef.current = setTimeout(() => {
        void refreshSessionRef.current?.()
      }, millisecondsUntilRefresh)
    },
    [clearRefreshTimer]
  )

  const clearSessionCookies = useCallback(async () => {
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      })
    } catch (error) {
      console.error("Failed to clear session cookies", error)
    }
  }, [])

  const notifySessionHandler = useCallback(
    async (token: string, refreshToken?: string, expiresAt?: number) => {
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ token, refreshToken, expiresAt }),
        })
      } catch (error) {
        console.error("Failed to notify session handler", error)
      }
    },
    []
  )

  const persistSessionTokens = useCallback(
    (accessToken: string, refreshToken?: string) => {
      if (typeof window === "undefined") {
        return
      }

      try {
        window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)

        if (refreshToken) {
          window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
        } else {
          window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
        }
      } catch (error) {
        console.warn("Failed to persist session tokens", error)
      }
    },
    []
  )

  const clearPersistedSessionTokens = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
      window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    } catch (error) {
      console.warn("Failed to clear persisted session tokens", error)
    }
  }, [])

  const clearSessionState = useCallback(() => {
    clearRefreshTimer()
    clearPersistedSessionTokens()
    sessionRef.current = null
    setSession(null)
  }, [clearPersistedSessionTokens, clearRefreshTimer])

  const handleUnauthorizedSession = useCallback(async () => {
    emitTelemetryEvent("auth.session.invalidated")
    await clearSessionCookies()
    clearSessionState()
    setUser(null)
    setIsLoading(false)

    try {
      const auth = await getFirebaseAuth()
      await auth.signOut()
    } catch (error) {
      console.error("Failed to sign out after unauthorized session", error)
    }

    router.push("/login")
  }, [
    clearSessionCookies,
    clearSessionState,
    emitTelemetryEvent,
    router,
  ])

  const applyBackendSession = useCallback(
    async (payload: BackendSessionResponse, firebaseUid: string) => {
      const accessToken =
        payload.accessToken ?? payload.access_token ?? payload.token
      const refreshToken = payload.refreshToken ?? payload.refresh_token
      const tokenType = payload.tokenType ?? payload.token_type ?? "Bearer"

      if (!accessToken) {
        throw new Error("Backend session missing access token")
      }

      const expiresInSeconds =
        payload.expiresIn ?? payload.expires_in ?? undefined

      const cookieExpiresAt = (() => {
        const explicitExpiresAt = payload.expiresAt
        if (typeof explicitExpiresAt === "number") {
          return explicitExpiresAt
        }

        if (typeof explicitExpiresAt === "string") {
          const timestamp = Date.parse(explicitExpiresAt)
          if (!Number.isNaN(timestamp)) {
            return timestamp
          }
        }

        if (typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)) {
          return Date.now() + expiresInSeconds * 1000
        }

        return undefined
      })()

      const resolvedExpiresAt = cookieExpiresAt ?? Date.now()

      const nextSession: AuthSession = {
        accessToken,
        refreshToken,
        tokenType,
        expiresAt: resolvedExpiresAt,
        refreshTokenExpiresAt:
          payload.refreshTokenExpiresAt ?? payload.refresh_token_expires_at,
        backendUser: payload.user,
        firebaseUid,
      }

      sessionRef.current = nextSession
      setSession(nextSession)
      if (refreshToken) {
        persistSessionTokens(accessToken, refreshToken)

        if (Number.isFinite(nextSession.expiresAt)) {
          scheduleRefresh(nextSession.expiresAt)
        } else {
          clearRefreshTimer()
        }
      } else {
        clearRefreshTimer()
      }

      await notifySessionHandler(accessToken, refreshToken, cookieExpiresAt)

      return nextSession
    },
    [
      clearRefreshTimer,
      notifySessionHandler,
      persistSessionTokens,
      scheduleRefresh,
    ]
  )

  const refreshSession = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession?.refreshToken) {
      return
    }

    try {
      const response = await fetch(buildApiUrl("/auth/token/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
      })

      if (response.status === 401) {
        await handleUnauthorizedSession()
        return
      }

      if (!response.ok) {
        const backendMessage = await parseBackendErrorMessage(response)
        emitTelemetryEvent("auth.token.refresh_failed", {
          status: response.status,
          message: backendMessage,
        })
        throw new Error(
          backendMessage ?? `Token refresh failed with status ${response.status}`
        )
      }

      const payload = (await response.json()) as BackendSessionResponse
      await applyBackendSession(payload, currentSession.firebaseUid)
    } catch (error) {
      emitTelemetryEvent("auth.token.refresh_error", {
        message: error instanceof Error ? error.message : "unknown",
      })
      await handleUnauthorizedSession()
    }
  }, [
    buildApiUrl,
    applyBackendSession,
    emitTelemetryEvent,
    handleUnauthorizedSession,
  ])

  useEffect(() => {
    refreshSessionRef.current = refreshSession

    return () => {
      if (refreshSessionRef.current === refreshSession) {
        refreshSessionRef.current = null
      }
    }
  }, [refreshSession])

  useEffect(() => {
    configureApiClientAuth({
      getSession: () => sessionRef.current,
      refreshSession,
      onUnauthorized: handleUnauthorizedSession,
    })
  }, [handleUnauthorizedSession, refreshSession])

  const exchangeFirebaseUser = useCallback(
    async (firebaseUser: FirebaseUser) => {
      const idToken = await firebaseUser.getIdToken()
      const response = await fetch(buildApiUrl("/auth/firebase-login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: idToken,
          idToken,
        }),
      })

      if (!response.ok) {
        const backendMessage = await parseBackendErrorMessage(response)
        emitTelemetryEvent("auth.token.exchange_failed", {
          status: response.status,
          message: backendMessage,
        })
        throw new Error(
          backendMessage ?? `Failed to exchange Firebase token (${response.status})`
        )
      }

      const payload = (await response.json()) as BackendSessionResponse
      const nextSession = await applyBackendSession(payload, firebaseUser.uid)
      return nextSession.backendUser
    },
    [buildApiUrl, applyBackendSession, emitTelemetryEvent]
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let isMounted = true
    let unsubscribe: ReturnType<FirebaseAuth["onAuthStateChanged"]> | undefined

    ;(async () => {
      try {
        const auth = await getFirebaseAuth()
        if (!isMounted) {
          return
        }

        unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
          if (!isMounted) {
            return
          }

          setUser(firebaseUser)

          if (!firebaseUser) {
            await clearSessionCookies()
            clearSessionState()
            setIsLoading(false)
            return
          }

          if (sessionRef.current?.firebaseUid === firebaseUser.uid) {
            setIsLoading(false)
            return
          }

          setIsLoading(true)

          try {
            await exchangeFirebaseUser(firebaseUser)
          } catch (error) {
            emitTelemetryEvent("auth.token.exchange_error", {
              message: error instanceof Error ? error.message : "unknown",
            })
            await handleUnauthorizedSession()
          } finally {
            if (isMounted) {
              setIsLoading(false)
            }
          }
        })

        if (auth.currentUser === null) {
          setIsLoading(false)
        } else {
          setUser(auth.currentUser)
        }
      } catch (error) {
        console.error("Firebase auth failed to initialize", error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [
    clearSessionCookies,
    clearSessionState,
    emitTelemetryEvent,
    exchangeFirebaseUser,
    handleUnauthorizedSession,
  ])

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await getFirebaseAuth()
      const credential = await auth.signInWithEmailAndPassword(email, password)
      setUser(credential.user)

      try {
        return await exchangeFirebaseUser(credential.user)
      } catch (error) {
        emitTelemetryEvent("auth.login.exchange_error", {
          message: error instanceof Error ? error.message : "unknown",
        })
        await auth.signOut()
        throw error
      }
    },
    [exchangeFirebaseUser, emitTelemetryEvent]
  )

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const auth = await getFirebaseAuth()
      const credential = await auth.createUserWithEmailAndPassword(email, password)

      if (displayName && credential.user) {
        await credential.user.updateProfile({ displayName })
      }

      setUser(credential.user)

      try {
        return await exchangeFirebaseUser(credential.user)
      } catch (error) {
        emitTelemetryEvent("auth.signup.exchange_error", {
          message: error instanceof Error ? error.message : "unknown",
        })
        await auth.signOut()
        throw error
      }
    },
    [exchangeFirebaseUser, emitTelemetryEvent]
  )

  const loginWithGoogle = useCallback(async () => {
    const auth = await getFirebaseAuth()
    const provider = await getGoogleAuthProvider()
    provider.setCustomParameters({ prompt: "select_account" })

    let credential: FirebaseUserCredential | null = null

    try {
      credential = await auth.signInWithPopup(provider)
    } catch (error) {
      const errorCode =
        error &&
        typeof error === "object" &&
        "code" in error
          ? (error as { code?: string | undefined }).code
          : undefined

      if (errorCode === "auth/popup-blocked") {
        const redirectCapableAuth = auth as FirebaseAuth & {
          signInWithRedirect?: (
            provider: FirebaseAuthProvider
          ) => Promise<void>
          getRedirectResult?: () => Promise<FirebaseUserCredential | null>
        }

        if (
          typeof redirectCapableAuth.signInWithRedirect !== "function" ||
          typeof redirectCapableAuth.getRedirectResult !== "function"
        ) {
          throw error
        }

        await redirectCapableAuth.signInWithRedirect(provider)
        credential = await redirectCapableAuth.getRedirectResult()
      } else if (errorCode && errorCode in GOOGLE_POPUP_ERROR_MESSAGES) {
        throw new Error(GOOGLE_POPUP_ERROR_MESSAGES[errorCode])
      } else {
        throw error
      }
    }

    if (!credential?.user) {
      throw new Error("Google login failed to acquire credentials")
    }

    setUser(credential.user)

    try {
      return await exchangeFirebaseUser(credential.user)
    } catch (error) {
      emitTelemetryEvent("auth.google.exchange_error", {
        message: error instanceof Error ? error.message : "unknown",
      })
      await auth.signOut()
      throw error
    }
  }, [exchangeFirebaseUser, emitTelemetryEvent])

  const resetPassword = useCallback(async (email: string) => {
    const auth = await getFirebaseAuth()
    await auth.sendPasswordResetEmail(email)
  }, [])

  const logout = useCallback(async () => {
    const auth = await getFirebaseAuth()
    try {
      if (sessionRef.current?.accessToken) {
        await fetch(buildApiUrl("/auth/logout"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionRef.current.accessToken}`,
          },
        }).catch((error) => {
          console.warn("Failed to notify backend logout", error)
        })
      }
    } finally {
      await clearSessionCookies()
      clearPersistedSessionTokens()
      clearSessionState()
      await auth.signOut()
    }
  }, [
    buildApiUrl,
    clearPersistedSessionTokens,
    clearSessionCookies,
    clearSessionState,
  ])

  const value = useMemo(
    () => ({
      user,
      backendUser: session?.backendUser ?? null,
      session,
      isLoading,
      login,
      signup,
      loginWithGoogle,
      resetPassword,
      logout,
    }),
    [user, session, isLoading, login, signup, loginWithGoogle, resetPassword, logout]
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
