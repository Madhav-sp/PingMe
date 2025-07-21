// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD02RJSTEEUQlZZGIt22s9UalxMkStCi4o",
  authDomain: "pingme-53779.firebaseapp.com",
  projectId: "pingme-53779",
  storageBucket: "pingme-53779.firebasestorage.app",
  messagingSenderId: "452200864112",
  appId: "1:452200864112:web:f42f15064af21cee5297b5",
  measurementId: "G-22EL5CEEMB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut };
