import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if we're in demo mode (no valid Firebase config)
const isDemoMode = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with the specific database name
const auth = getAuth(app);
const db = getFirestore(app, 'b8s-reseller-db');
const defaultDb = getFirestore(app); // Keep reference to default DB for functions
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, defaultDb, storage, functions, isDemoMode };

export default app; 