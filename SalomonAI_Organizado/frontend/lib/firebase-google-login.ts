import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCx_hhaofaGJDCtL01BKfB3-LJsg4lAxmQ",
  authDomain: "prueba-salomon-56821.firebaseapp.com",
  projectId: "prueba-salomon-56821",
  storageBucket: "prueba-salomon-56821.firebasestorage.app",
  messagingSenderId: "327391238339",
  appId: "1:327391238339:web:f03e4b517b7478a5286a76",
  measurementId: "G-DEQ9GDQDJH"
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Google sign-in error:", error.message);
    } else {
      console.error("Google sign-in error:", error);
    }
    throw error;
  }
}