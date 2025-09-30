import { getAnalytics, isSupported, type Analytics } from "firebase/analytics"
import {
  GoogleAuthProvider,
  getAuth,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth"
import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from "firebase/app"

type FirebaseOptions = {
  apiKey?: string
  authDomain?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
  measurementId?: string
}

const fallbackConfig: Required<FirebaseOptions> = {
  apiKey: "AIzaSyBPIgdQ9kZFyUEDfCyPsDgRyzyabvuLkmo",
  authDomain: "prueba-salomon.firebaseapp.com",
  projectId: "prueba-salomon",
  storageBucket: "prueba-salomon.firebasestorage.app",
  messagingSenderId: "933892716551",
  appId: "1:933892716551:web:cb3872e02fa775ad3b12a2",
  measurementId: "G-KXWWZP4CMF",
}

const firebaseConfig: Required<FirebaseOptions> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? fallbackConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackConfig.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fallbackConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? fallbackConfig.appId,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? fallbackConfig.measurementId,
}

const requiredKeys: (keyof FirebaseOptions)[] = [
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
let firebaseAnalyticsPromise: Promise<Analytics | null> | null = null

export type { FirebaseApp, Auth as FirebaseAuth, User as FirebaseUser, UserCredential as FirebaseUserCredential }
export { GoogleAuthProvider }

export const getFirebaseApp = async (): Promise<FirebaseApp> => {
  if (typeof window === "undefined") {
    throw new Error("Firebase app can only be initialized in the browser environment.")
  }

  if (!firebaseApp) {
    warnIfConfigMissing()

    if (!hasValidConfig) {
      throw new Error("Firebase configuration is incomplete. Check your environment variables.")
    }

    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  }

  return firebaseApp
}

export const getFirebaseAuth = async (): Promise<Auth> => {
  if (typeof window === "undefined") {
    throw new Error("Firebase auth can only be used in the browser environment.")
  }

  if (!firebaseAuth) {
    const app = await getFirebaseApp()
    firebaseAuth = getAuth(app)
  }

  return firebaseAuth
}

export const getGoogleAuthProvider = async (): Promise<GoogleAuthProvider> => {
  if (typeof window === "undefined") {
    throw new Error("Firebase auth can only be used in the browser environment.")
  }

  return new GoogleAuthProvider()
}

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") {
    return null
  }

  if (!firebaseAnalyticsPromise) {
    firebaseAnalyticsPromise = (async () => {
      if (!(await isSupported())) {
        return null
      }

      const app = await getFirebaseApp()
      return getAnalytics(app)
    })().catch((error) => {
      console.warn("Firebase analytics could not be initialized:", error)
      firebaseAnalyticsPromise = null
      return null
    })
  }

  return firebaseAnalyticsPromise
}
