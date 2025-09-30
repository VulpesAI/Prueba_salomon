import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBPIgdQ9kZFyUEDfCyPsDgRyzyabvuLkmo",
  authDomain: "prueba-salomon.firebaseapp.com",
  projectId: "prueba-salomon",
  storageBucket: "prueba-salomon.appspot.com",
  messagingSenderId: "933892716551",
  appId: "1:933892716551:web:cb3872e02fa775ad3b12a2",
  measurementId: "G-KXWWZP4CMF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const token = await user.getIdToken();
    return { user, token };
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}