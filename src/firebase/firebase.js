import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD0c2KrueYGsQy1kWWd01TQkH_f_vKFgzk",
  authDomain: "xchange-x29.firebaseapp.com",
  projectId: "xchange-x29",
  storageBucket: "xchange-x29.firebasestorage.app",
  messagingSenderId: "545086832136",
  appId: "1:545086832136:web:0d7b78a5853ed75cd15bbd",
  measurementId: "G-294RY7PRKK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
