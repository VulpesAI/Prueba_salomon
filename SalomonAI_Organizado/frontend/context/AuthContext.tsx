"use client"

import { createContext, useContext, type ReactNode } from "react"

export type AuthUser = {
  uid?: string
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}

type AuthContextType = {
  user: AuthUser | null
  backendUser: null
  session: null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName?: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const firebaseDisabledError = (action: string) =>
  new Error(`Firebase authentication has been deshabilitada: ${action} no está disponible.`)

const throwLoginDisabled = async (): Promise<void> => {
  throw firebaseDisabledError("login")
}

const throwSignupDisabled = async (): Promise<void> => {
  throw firebaseDisabledError("signup")
}

const throwGoogleDisabled = async (): Promise<void> => {
  throw firebaseDisabledError("login con Google")
}

const throwResetDisabled = async (): Promise<void> => {
  throw firebaseDisabledError("recuperar contraseña")
}

const logout = async (): Promise<void> => {
  // No hay sesión activa que limpiar cuando Firebase está deshabilitado.
}

const defaultValue: AuthContextType = {
  user: null,
  backendUser: null,
  session: null,
  isLoading: false,
  login: async (email, password) => {
    void email
    void password
    await throwLoginDisabled()
  },
  signup: async (email, password, displayName) => {
    void email
    void password
    void displayName
    await throwSignupDisabled()
  },
  loginWithGoogle: async () => {
    await throwGoogleDisabled()
  },
  resetPassword: async (email) => {
    void email
    await throwResetDisabled()
  },
  logout,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={defaultValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
