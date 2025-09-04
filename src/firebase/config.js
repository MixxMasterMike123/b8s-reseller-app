import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration from environment variables
// For development, we'll use the API key directly here to ensure it works
const firebaseConfig = {
  apiKey: "AIzaSyCsYgMVRlipm-PxsHPZOxew5tqcZ_3Kccw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shop.b8shield.com",
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
const functions = getFunctions(app, 'us-central1');

// Connect to local functions when enabled via localStorage
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const useLocalFunctions = localStorage.getItem('b8shield-use-local-functions') === 'true';

// Add global toggle function for easy debugging
window.toggleLocalFunctions = () => {
  const current = localStorage.getItem('b8shield-use-local-functions') === 'true';
  localStorage.setItem('b8shield-use-local-functions', (!current).toString());
  console.log(`🔧 Local functions ${!current ? 'ENABLED' : 'DISABLED'}. Reload page to take effect.`);
};

if (useLocalFunctions && !isDemoMode) {
  console.log('🔧 Using LOCAL Firebase Functions for Google Merchant API...');
  
  // Only connect to Functions emulator for Google Merchant operations
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('✅ Connected to LOCAL Functions emulator on localhost:5001');
    console.log('💡 To disable: Run toggleLocalFunctions() in console and reload');
  } catch (error) {
    console.log('⚠️ Local Functions connection failed:', error.message);
    console.log('💡 Make sure to run: firebase emulators:start --only functions');
  }
} else if (isLocalhost && !isDemoMode) {
  console.log('🔧 Development mode: Connecting to all emulators...');
  
  // Full emulator suite for development
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('✅ Connected to Functions emulator on localhost:5001');
  } catch (error) {
    console.log('⚠️ Functions emulator connection failed:', error.message);
  }
  
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('✅ Connected to Auth emulator on localhost:9099');
  } catch (error) {
    console.log('⚠️ Auth emulator connection failed:', error.message);
  }
  
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('✅ Connected to Firestore emulator on localhost:8080');
  } catch (error) {
    console.log('⚠️ Firestore emulator connection failed:', error.message);
  }
  
  try {
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('✅ Connected to Storage emulator on localhost:9199');
  } catch (error) {
    console.log('⚠️ Storage emulator connection failed:', error.message);
  }
}

// Export a helper function to get a direct storage URL (bypassing CORS issues)
export const getDirectStorageUrl = (path) => {
  if (!path) return null;
  // Construct a direct storage URL that doesn't require a tokens/auth
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;
};

export { auth, db, storage, functions, isDemoMode };

export default app; 