"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  getFirebaseAuth,
  getGoogleAuthProvider,
  type FirebaseAuth,
  type FirebaseUser,
  type FirebaseUserCredential,
} from "@/lib/firebase"

type AuthContextType = {
  user: FirebaseUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<FirebaseUserCredential>
  signup: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<FirebaseUserCredential>
  loginWithGoogle: () => Promise<FirebaseUserCredential>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

        unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
          if (!isMounted) {
            return
          }

          setUser(firebaseUser)
          setIsLoading(false)
        })

        if (auth.currentUser === null) {
          setIsLoading(false)
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
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const auth = await getFirebaseAuth()
    return auth.signInWithEmailAndPassword(email, password)
  }, [])

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const auth = await getFirebaseAuth()
      const credential = await auth.createUserWithEmailAndPassword(email, password)

      if (displayName && credential.user) {
        await credential.user.updateProfile({ displayName })
      }

      return credential
    },
    []
  )

  const loginWithGoogle = useCallback(async () => {
    const auth = await getFirebaseAuth()
    const provider = await getGoogleAuthProvider()
    provider.setCustomParameters({ prompt: "select_account" })
    return auth.signInWithPopup(provider)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const auth = await getFirebaseAuth()
    await auth.sendPasswordResetEmail(email)
  }, [])

  const logout = useCallback(async () => {
    const auth = await getFirebaseAuth()
    await auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, login, signup, loginWithGoogle, resetPassword, logout }),
    [user, isLoading, login, signup, loginWithGoogle, resetPassword, logout]
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
