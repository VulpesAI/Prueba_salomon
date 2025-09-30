import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app"
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
  type UserCredential,
  updateProfile,
} from "firebase/auth"
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics"

const fallbackConfig = {
  apiKey: "AIzaSyBPIgdQ9kZFyUEDfCyPsDgRyzyabvuLkmo",
  authDomain: "prueba-salomon.firebaseapp.com",
  projectId: "prueba-salomon",
  storageBucket: "prueba-salomon.firebasestorage.app",
  messagingSenderId: "933892716551",
  appId: "1:933892716551:web:cb3872e02fa775ad3b12a2",
  measurementId: "G-KXWWZP4CMF",
}

type FirebaseConfig = {
  apiKey?: string
  authDomain?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
  measurementId?: string
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? fallbackConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackConfig.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackConfig.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fallbackConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? fallbackConfig.appId,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? fallbackConfig.measurementId,
}

const requiredKeys: (keyof FirebaseConfig)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
]

const hasValidConfig = requiredKeys.every((key) => {
  const value = firebaseConfig[key]
  return typeof value === "string" && value.length > 0
})

const warnIfConfigMissing = () => {
  if (!hasValidConfig) {
    console.warn("Firebase configuration is incomplete. Check your environment variables.")
  }
}

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let analyticsPromise: Promise<Analytics | null> | null = null

export const getFirebaseApp = (): FirebaseApp => {
  if (typeof window === "undefined") {
    throw new Error("Firebase app can only be initialized in the browser environment.")
  }

  if (!firebaseApp) {
    warnIfConfigMissing()

    if (!hasValidConfig) {
      throw new Error("Firebase configuration is incomplete. Check your environment variables.")
    }

    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
  }

  return firebaseApp
}

export const getFirebaseAuth = (): Auth => {
  if (typeof window === "undefined") {
    throw new Error("Firebase auth can only be used in the browser environment.")
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp())
  }

  return firebaseAuth
}

export const getGoogleAuthProvider = () => new GoogleAuthProvider()

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") {
    return null
  }

  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      try {
        const app = getFirebaseApp()
        const supported = await isSupported()
        if (!supported) {
          return null
        }

        return getAnalytics(app)
      } catch (error) {
        console.warn("Firebase analytics could not be initialized:", error)
        return null
      }
    })()
  }

  return analyticsPromise
}

export type FirebaseOptions = FirebaseConfig
export type FirebaseAuth = Auth
export type FirebaseUser = User
export type FirebaseUserCredential = UserCredential
export type FirebaseAnalytics = Analytics

export {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
}
