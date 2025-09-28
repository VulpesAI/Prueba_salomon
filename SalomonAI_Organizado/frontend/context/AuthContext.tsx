"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  GoogleAuthProvider,
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type UserCredential,
} from "firebase/auth"

import { getFirebaseAuth } from "@/lib/firebase"

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<UserCredential>
  signup: (email: string, password: string, displayName?: string) => Promise<UserCredential>
  loginWithGoogle: () => Promise<UserCredential>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const auth = getFirebaseAuth()

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser)
        setIsLoading(false)
      })

      return () => unsubscribe()
    } catch (error) {
      console.error("Firebase auth failed to initialize", error)
      setIsLoading(false)
    }
  }, [])

  const login = (email: string, password: string) => {
    const auth = getFirebaseAuth()
    return signInWithEmailAndPassword(auth, email, password)
  }

  const signup = async (email: string, password: string, displayName?: string) => {
    const auth = getFirebaseAuth()
    const credential = await createUserWithEmailAndPassword(auth, email, password)

    if (displayName) {
      await updateProfile(credential.user, { displayName })
    }

    return credential
  }

  const loginWithGoogle = () => {
    const auth = getFirebaseAuth()
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: "select_account" })
    return signInWithPopup(auth, provider)
  }

  const resetPassword = (email: string) => {
    const auth = getFirebaseAuth()
    return sendPasswordResetEmail(auth, email)
  }

  const logout = () => {
    const auth = getFirebaseAuth()
    return signOut(auth)
  }

  const value = useMemo(
    () => ({ user, isLoading, login, signup, loginWithGoogle, resetPassword, logout }),
    [user, isLoading]
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
