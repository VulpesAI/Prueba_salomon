const FIREBASE_SDK_VERSION = process.env.NEXT_PUBLIC_FIREBASE_SDK_VERSION ?? "10.13.2";

export type FirebaseOptions = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

export interface FirebaseApp {
  name: string;
  options: FirebaseOptions;
}

export type FirebaseAnalytics = unknown;

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  updateProfile: (profile: { displayName?: string | null }) => Promise<void>;
}

export interface FirebaseUserCredential {
  user: FirebaseUser;
}

export interface FirebaseAuthProvider {
  setCustomParameters: (params: Record<string, string>) => void;
}

export interface FirebaseAuth {
  currentUser: FirebaseUser | null;
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => () => void;
  createUserWithEmailAndPassword: (
    email: string,
    password: string
  ) => Promise<FirebaseUserCredential>;
  signInWithEmailAndPassword: (
    email: string,
    password: string
  ) => Promise<FirebaseUserCredential>;
  signInWithPopup: (provider: FirebaseAuthProvider) => Promise<FirebaseUserCredential>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

type FirebaseNamespace = {
  apps: FirebaseApp[];
  initializeApp: (config: FirebaseOptions) => FirebaseApp;
  app: () => FirebaseApp;
  analytics?: (app?: FirebaseApp) => FirebaseAnalytics;
  auth: {
    (app?: FirebaseApp): FirebaseAuth;
    GoogleAuthProvider: new () => FirebaseAuthProvider;
  };
};

declare global {
  interface Window {
    firebase?: FirebaseNamespace;
  }
}

const compatScripts = [
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth-compat.js`,
];

const analyticsScript = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-analytics-compat.js`;

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Firebase SDK requires a browser environment."));
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
        return;
      }

      existing.addEventListener(
        "load",
        () => resolve(),
        { once: true }
      );
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load Firebase SDK script: ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-firebase-sdk", src);
    script.addEventListener(
      "load",
      () => {
        script.setAttribute("data-loaded", "true");
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Failed to load Firebase SDK script: ${src}`));
      },
      { once: true }
    );

    document.head.appendChild(script);
  });

let firebaseNamespacePromise: Promise<FirebaseNamespace> | null = null;

const ensureFirebaseNamespace = async (): Promise<FirebaseNamespace> => {
  if (typeof window === "undefined") {
    throw new Error("Firebase SDK can only be used in the browser environment.");
  }

  if (window.firebase) {
    return window.firebase;
  }

  if (!firebaseNamespacePromise) {
    firebaseNamespacePromise = (async () => {
      for (const src of compatScripts) {
        await loadScript(src);
      }

      if (!window.firebase) {
        throw new Error("Firebase SDK failed to load.");
      }

      return window.firebase;
    })().catch((error) => {
      firebaseNamespacePromise = null;
      throw error;
    });
  }

  return firebaseNamespacePromise;
};

const fallbackConfig: FirebaseOptions = {
  apiKey: "AIzaSyBPIgdQ9kZFyUEDfCyPsDgRyzyabvuLkmo",
  authDomain: "prueba-salomon.firebaseapp.com",
  projectId: "prueba-salomon",
  storageBucket: "prueba-salomon.firebasestorage.app",
  messagingSenderId: "933892716551",
  appId: "1:933892716551:web:cb3872e02fa775ad3b12a2",
  measurementId: "G-KXWWZP4CMF",
};

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? fallbackConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fallbackConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? fallbackConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? fallbackConfig.measurementId,
};

const requiredKeys: (keyof FirebaseOptions)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const hasValidConfig = requiredKeys.every((key) => {
  const value = firebaseConfig[key];
  return typeof value === "string" && value.length > 0;
});

const warnIfConfigMissing = () => {
  if (!hasValidConfig) {
    console.warn("Firebase configuration is incomplete. Check your environment variables.");
  }
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: FirebaseAuth | null = null;
let firebaseAnalytics: FirebaseAnalytics | null = null;

const ensureFirebaseApp = async (): Promise<FirebaseApp> => {
  if (!firebaseApp) {
    warnIfConfigMissing();

    if (!hasValidConfig) {
      throw new Error("Firebase configuration is incomplete. Check your environment variables.");
    }

    const firebase = await ensureFirebaseNamespace();
    firebaseApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  }

  return firebaseApp;
};

export const getFirebaseApp = async (): Promise<FirebaseApp> => {
  if (typeof window === "undefined") {
    throw new Error("Firebase app can only be initialized in the browser environment.");
  }

  return ensureFirebaseApp();
};

export const getFirebaseAuth = async (): Promise<FirebaseAuth> => {
  if (typeof window === "undefined") {
    throw new Error("Firebase auth can only be used in the browser environment.");
  }

  if (!firebaseAuth) {
    const firebase = await ensureFirebaseNamespace();
    const app = await ensureFirebaseApp();
    firebaseAuth = firebase.auth(app);
  }

  return firebaseAuth;
};

export const getGoogleAuthProvider = async (): Promise<FirebaseAuthProvider> => {
  if (typeof window === "undefined") {
    throw new Error("Firebase auth can only be used in the browser environment.");
  }

  const firebase = await ensureFirebaseNamespace();
  return new firebase.auth.GoogleAuthProvider();
};

const ensureAnalyticsLoaded = async (): Promise<void> => {
  const firebase = await ensureFirebaseNamespace();
  if (typeof firebase.analytics === "function") {
    return;
  }

  await loadScript(analyticsScript);
};

export const getFirebaseAnalytics = async (): Promise<FirebaseAnalytics | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  if (firebaseAnalytics) {
    return firebaseAnalytics;
  }

  try {
    await ensureAnalyticsLoaded();
    const firebase = await ensureFirebaseNamespace();
    if (typeof firebase.analytics !== "function") {
      return null;
    }

    const app = await ensureFirebaseApp();
    firebaseAnalytics = firebase.analytics(app);
  } catch (error) {
    console.warn("Firebase analytics could not be initialized:", error);
    return null;
  }

  return firebaseAnalytics;
};
