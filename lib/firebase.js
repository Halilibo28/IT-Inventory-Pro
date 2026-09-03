import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCOCIbW4_HaxHxLDbW7zrQ8dqwZOYeBbEI",
  authDomain: "it-inventory-pro.firebaseapp.com",
  databaseURL: "https://it-inventory-pro-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "it-inventory-pro",
  storageBucket: "it-inventory-pro.firebasestorage.app",
  messagingSenderId: "611568674521",
  appId: "1:611568674521:web:7d0d8e23f22a8351b8c0c8",
  measurementId: "G-CT474ZFDFR"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, auth, db, analytics };
