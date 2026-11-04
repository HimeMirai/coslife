import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyARvEO3I_12GCiTL0nMsGb8JTlrTE41aOk",
  authDomain: "coslife-7dfdb.firebaseapp.com",
  projectId: "coslife-7dfdb",
  storageBucket: "coslife-7dfdb.firebasestorage.app",
  messagingSenderId: "650325140859",
  appId: "1:650325140859:web:08bab9a084119f421089de",
  measurementId: "G-W38MR78EWK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);