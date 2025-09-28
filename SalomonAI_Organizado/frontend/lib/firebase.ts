import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isBrowser = typeof window !== "undefined";

const hasValidConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0,
);

const warnIfConfigMissing = () => {
  if (!hasValidConfig) {
    console.warn("Firebase configuration is incomplete. Check your environment variables.");
  }
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseAnalytics: Analytics | null = null;

const ensureFirebaseApp = (): FirebaseApp => {
  if (!firebaseApp) {
    warnIfConfigMissing();

    if (!hasValidConfig) {
      throw new Error("Firebase configuration is incomplete. Check your environment variables.");
    }

    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  return firebaseApp;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!isBrowser) {
    throw new Error("Firebase app can only be initialized in the browser environment.");
  }

  return ensureFirebaseApp();
};

export const getFirebaseAuth = (): Auth => {
  if (!isBrowser) {
    throw new Error("Firebase auth can only be used in the browser environment.");
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(ensureFirebaseApp());
  }

  return firebaseAuth;
};

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (!isBrowser) {
    return null;
  }

  if (firebaseAnalytics) {
    return firebaseAnalytics;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      return null;
    }

    firebaseAnalytics = getAnalytics(ensureFirebaseApp());
  } catch (error) {
    console.warn("Firebase analytics could not be initialized:", error);
  }

  return firebaseAnalytics;
};
