import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableMultiTabIndexedDbPersistence,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
} from "firebase/storage";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Set persistence to LOCAL so user stays logged in across sessions
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Failed to set persistence:", error);
});

// Enable offline persistence for Firestore
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Firestore offline persistence failed: Multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore offline persistence not supported in this browser");
  }
});

// Enable emulators in development (optional - comment out if not using Firebase Emulator Suite)
// if (process.env.NODE_ENV === "development") {
//   if (!auth.emulatorConfig) connectAuthEmulator(auth, "http://localhost:9099");
//   if (!db._settingsFrozen) connectFirestoreEmulator(db, "localhost", 8080);
//   if (!storage.emulatorConfig) connectStorageEmulator(storage, "localhost", 9199);
// }

export default app;
