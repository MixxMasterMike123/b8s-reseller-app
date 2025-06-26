import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration from environment variables
// For development, we'll use the API key directly here to ensure it works
const firebaseConfig = {
  apiKey: "AIzaSyCsYgMVRlipm-PxsHPZOxew5tqcZ_3Kccw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "b8shield-reseller-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "b8shield-reseller-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "b8shield-reseller-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "996315128348",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:996315128348:web:75388494e2bcdfa1f3f5d9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7JFF08MLM2"
};

// Check if we're in demo mode (no valid Firebase config)
const isDemoMode = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with the specific database name
const auth = getAuth(app);
const db = getFirestore(app, 'b8s-reseller-db');
const storage = getStorage(app);
const functions = getFunctions(app);

// Export a helper function to get a direct storage URL (bypassing CORS issues)
export const getDirectStorageUrl = (path) => {
  if (!path) return null;
  // Construct a direct storage URL that doesn't require a tokens/auth
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;
};

export { auth, db, storage, functions, isDemoMode };

export default app; 