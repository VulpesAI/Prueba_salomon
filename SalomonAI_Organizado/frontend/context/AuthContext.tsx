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
  uid: string
  email?: string | null
  name?: string | null
  picture?: string | null
  [key: string]: unknown
}

type BackendSessionResponse = {
  token: string
  user: BackendUser
  tokenType?: string | null
  refreshToken?: string | null
  refresh_token?: string | null
  expiresAt?: string | number | Date | null
  expires_at?: string | number | Date | null
  expiresIn?: number | string | null
  expires_in?: number | string | null
  [key: string]: unknown
}

export type AuthSession = {
  accessToken: string
  tokenType: string
  backendUser: BackendUser
  firebaseUid: string
  refreshToken?: string | null
  expiresAt?: string | number | Date | null
}

const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true"

const DEMO_BACKEND_USER: BackendUser = {
  uid: "demo-user",
  email: "demo@example.com",
  name: "Demo User",
}

const DEMO_SESSION: AuthSession = {
  accessToken: "demo-access-token",
  tokenType: "Bearer",
  backendUser: DEMO_BACKEND_USER,
  firebaseUid: DEMO_BACKEND_USER.uid,
  refreshToken: null,
  expiresAt: null,
}

const createDemoFirebaseUser = (): FirebaseUser =>
  ({
    uid: DEMO_BACKEND_USER.uid,
    email: DEMO_BACKEND_USER.email ?? null,
    displayName: DEMO_BACKEND_USER.name ?? null,
    getIdToken: async () => DEMO_SESSION.accessToken,
  } as unknown as FirebaseUser)

type AuthContextType = {
  user: FirebaseUser | null
  backendUser: BackendUser | null
  session: AuthSession | null
  isLoading: boolean
  isAuthDisabled: boolean
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

const GOOGLE_POPUP_ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user":
    "La ventana de acceso se cerró antes de completar el inicio de sesión.",
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const initialDemoUser = authDisabled ? createDemoFirebaseUser() : null
  const initialSession = authDisabled ? DEMO_SESSION : null
  const [user, setUser] = useState<FirebaseUser | null>(initialDemoUser)
  const [session, setSession] = useState<AuthSession | null>(initialSession)
  const [isLoading, setIsLoading] = useState(!authDisabled)

  const sessionRef = useRef<AuthSession | null>(initialSession)
  const demoFirebaseUserRef = useRef<FirebaseUser | null>(initialDemoUser)

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

  const setSessionState = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession
    setSession(nextSession)
  }, [])

  const clearSessionCookies = useCallback(async () => {
    if (authDisabled) {
      return
    }
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      })
    } catch (error) {
      console.error("Failed to clear authentication cookies", error)
    }
  }, [])

  const performLogout = useCallback(async () => {
    setSessionState(null)
    setUser(null)
    setIsLoading(false)

    if (authDisabled) {
      return
    }

    await clearSessionCookies()

    try {
      const auth = await getFirebaseAuth()
      await auth.signOut()
    } catch (error) {
      console.error("Failed to sign out from Firebase", error)
    }
  }, [clearSessionCookies, setSessionState])

  const logout = useCallback(async () => {
    if (authDisabled) {
      setSessionState(DEMO_SESSION)
      if (!demoFirebaseUserRef.current) {
        demoFirebaseUserRef.current = createDemoFirebaseUser()
      }
      setUser(demoFirebaseUserRef.current)
      setIsLoading(false)
      await clearSessionCookies()
      return
    }
    await performLogout()
  }, [clearSessionCookies, performLogout])

  const handleUnauthorizedSession = useCallback(async () => {
    if (authDisabled) {
      setSessionState(DEMO_SESSION)
      if (!demoFirebaseUserRef.current) {
        demoFirebaseUserRef.current = createDemoFirebaseUser()
      }
      setUser(demoFirebaseUserRef.current)
      setIsLoading(false)
      return
    }
    await performLogout()
    router.push("/login")
  }, [performLogout, router])

  useEffect(() => {
    configureApiClientAuth({
      getSession: () => sessionRef.current,
      onUnauthorized: handleUnauthorizedSession,
    })
  }, [handleUnauthorizedSession])

  const persistLocalSession = useCallback(
    async ({
      token,
      refreshToken,
      expiresAt,
    }: {
      token: string
      refreshToken?: string | null
      expiresAt?: string | number | Date | null
    }) => {
      const sessionPayload: Record<string, unknown> = { token }

      if (refreshToken !== undefined && refreshToken !== null) {
        sessionPayload.refreshToken = refreshToken
      }

      if (expiresAt !== undefined && expiresAt !== null) {
        sessionPayload.expiresAt = expiresAt
      }

      if (authDisabled) {
        return
      }

      const localResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(sessionPayload),
      })

      if (!localResponse.ok) {
        throw new Error(
          `Failed to persist authentication session (${localResponse.status})`
        )
      }
    },
    []
  )

  const exchangeFirebaseUser = useCallback(
    async (firebaseUser: FirebaseUser) => {
      const idToken = await firebaseUser.getIdToken()
      const loginPayload = { token: idToken, idToken } as const

      const response = await fetch(buildApiUrl("/auth/firebase-login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginPayload),

      })

      if (!response.ok) {
        const backendMessage = await parseBackendErrorMessage(response)
        throw new Error(
          backendMessage ?? `Failed to exchange Firebase token (${response.status})`
        )
      }

      const payload = (await response.json()) as BackendSessionResponse

      if (!payload?.token) {
        throw new Error("Backend session missing access token")
      }

      const refreshToken =
        typeof payload.refreshToken === "string" && payload.refreshToken.length > 0
          ? payload.refreshToken
          : typeof payload.refresh_token === "string" &&
              payload.refresh_token.length > 0
            ? payload.refresh_token
            : null

      const directExpiresAt =
        payload.expiresAt ?? payload.expires_at ?? null

      let expiresAt: string | number | Date | null = null

      if (
        typeof directExpiresAt === "string" ||
        typeof directExpiresAt === "number" ||
        directExpiresAt instanceof Date
      ) {
        expiresAt = directExpiresAt
      } else {
        const expiresInRaw = payload.expiresIn ?? payload.expires_in ?? null

        if (typeof expiresInRaw === "number" && Number.isFinite(expiresInRaw)) {
          expiresAt = new Date(Date.now() + expiresInRaw * 1000).toISOString()
        } else if (
          typeof expiresInRaw === "string" &&
          expiresInRaw.trim().length > 0
        ) {
          const parsed = Number.parseFloat(expiresInRaw)
          if (Number.isFinite(parsed)) {
            expiresAt = new Date(Date.now() + parsed * 1000).toISOString()
          }
        }
      }

      await persistLocalSession({
        token: payload.token,
        refreshToken,
        expiresAt,
      })

      const nextSession: AuthSession = {
        accessToken: payload.token,
        tokenType:
          typeof payload.tokenType === "string" && payload.tokenType.length > 0
            ? payload.tokenType
            : "Bearer",
        backendUser: payload.user,
        firebaseUid: firebaseUser.uid,
        refreshToken,
        expiresAt,
      }

      setSessionState(nextSession)
      return nextSession.backendUser
    },
    [buildApiUrl, persistLocalSession, setSessionState]
  )

  useEffect(() => {
    if (authDisabled) {
      setSessionState(DEMO_SESSION)
      if (!demoFirebaseUserRef.current) {
        demoFirebaseUserRef.current = createDemoFirebaseUser()
      }
      setUser(demoFirebaseUserRef.current)
      setIsLoading(false)
      return
    }

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
            setSessionState(null)
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
            console.error("Failed to exchange Firebase token", error)
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

          if (sessionRef.current?.firebaseUid !== auth.currentUser.uid) {
            try {
              setIsLoading(true)
              await exchangeFirebaseUser(auth.currentUser)
            } catch (error) {
              console.error("Failed to restore Firebase session", error)
              await handleUnauthorizedSession()
            } finally {
              if (isMounted) {
                setIsLoading(false)
              }
            }
          } else {
            setIsLoading(false)
          }
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
  }, [exchangeFirebaseUser, handleUnauthorizedSession, setSessionState])

  const login = useCallback(
    async (email: string, password: string) => {
      if (authDisabled) {
        setSessionState(DEMO_SESSION)
        if (!demoFirebaseUserRef.current) {
          demoFirebaseUserRef.current = createDemoFirebaseUser()
        }
        setUser(demoFirebaseUserRef.current)
        return DEMO_BACKEND_USER
      }
      const auth = await getFirebaseAuth()
      const credential = await auth.signInWithEmailAndPassword(email, password)
      setUser(credential.user)

      try {
        return await exchangeFirebaseUser(credential.user)
      } catch (error) {
        await auth.signOut()
        throw error
      }
    },
    [exchangeFirebaseUser]
  )

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (authDisabled) {
        setSessionState(DEMO_SESSION)
        if (!demoFirebaseUserRef.current) {
          demoFirebaseUserRef.current = createDemoFirebaseUser()
        }
        setUser(demoFirebaseUserRef.current)
        return DEMO_BACKEND_USER
      }
      const auth = await getFirebaseAuth()
      const credential = await auth.createUserWithEmailAndPassword(email, password)

      if (displayName && credential.user) {
        await credential.user.updateProfile({ displayName })
      }

      setUser(credential.user)

      try {
        return await exchangeFirebaseUser(credential.user)
      } catch (error) {
        await auth.signOut()
        throw error
      }
    },
    [exchangeFirebaseUser]
  )

  const loginWithGoogle = useCallback(async () => {
    if (authDisabled) {
      setSessionState(DEMO_SESSION)
      if (!demoFirebaseUserRef.current) {
        demoFirebaseUserRef.current = createDemoFirebaseUser()
      }
      setUser(demoFirebaseUserRef.current)
      return DEMO_BACKEND_USER
    }
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
      await auth.signOut()
      throw error
    }
  }, [exchangeFirebaseUser])

  const resetPassword = useCallback(async (email: string) => {
    if (authDisabled) {
      return
    }
    const auth = await getFirebaseAuth()
    await auth.sendPasswordResetEmail(email)
  }, [])

  const value = useMemo(
    () => ({
      user,
      backendUser: session?.backendUser ?? null,
      session,
      isLoading,
      isAuthDisabled: authDisabled,
      login,
      signup,
      loginWithGoogle,
      resetPassword,
      logout,
    }),
    [
      user,
      session,
      isLoading,
      authDisabled,
      login,
      signup,
      loginWithGoogle,
      resetPassword,
      logout,
    ]
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
