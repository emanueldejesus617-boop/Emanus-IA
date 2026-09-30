import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence, 
  indexedDBLocalPersistence, 
  browserPopupRedirectResolver, 
  GoogleAuthProvider, 
  Auth 
} from "firebase/auth";

// Firebase configuration from environment variables with valid fallback
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCUOk7aJ8nzvftZHcQeqVIfOLaBH8_mLDs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "emanus-ia.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "emanus-ia",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "emanus-ia.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "160942215200",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:160942215200:web:d222b735ebec015b4dac45"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth;
if (typeof window !== "undefined") {
  try {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    authInstance = getAuth(app);
  }
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();

// Customize Google Provider prompt to ask account selection
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
