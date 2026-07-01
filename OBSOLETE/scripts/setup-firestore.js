import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { config } from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Initialize dotenv
const __dirname = dirname(fileURLToPath(import.meta.url));
config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log('Firebase config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Using production Firebase (no emulator)
console.log('Connecting to production Firebase database');

// Create admin user
async function createAdminUser() {
  try {
    const adminRef = doc(collection(db, 'users'), 'admin');
    await setDoc(adminRef, {
      email: 'admin@b8shield.com',
      companyName: 'B8shield Admin',
      role: 'admin',
      isActive: true,
      contactPerson: 'Admin User',
      phone: '+46123456789',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Create sample products
async function createSampleProducts() {
  try {
    const products = [
      {
        id: 'prod-001',
        name: 'B8shield Basic',
        description: 'Basic security solution for small businesses',
        price: 499,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'prod-002',
        name: 'B8shield Pro',
        description: 'Advanced security solution with extended features',
        price: 999,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        id: 'prod-003',
        name: 'B8shield Enterprise',
        description: 'Complete security solution for large organizations',
        price: 1999,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const product of products) {
      const { id, ...productData } = product;
      const productRef = doc(collection(db, 'products'), id);
      await setDoc(productRef, productData);
    }
    console.log('Sample products created successfully');
  } catch (error) {
    console.error('Error creating sample products:', error);
  }
}

// Create app settings
async function createAppSettings() {
  try {
    const settingsRef = doc(collection(db, 'settings'), 'app');
    await setDoc(settingsRef, {
      orderNumberPrefix: 'B8-',
      orderStartNumber: 1000,
      companyName: 'B8shield AB',
      companyEmail: 'info@b8shield.com',
      companyPhone: '+46123456789',
      companyAddress: 'Stockholm, Sweden',
      updatedAt: serverTimestamp()
    });
    console.log('App settings created successfully');
  } catch (error) {
    console.error('Error creating app settings:', error);
  }
}

// Create order statuses
async function createOrderStatuses() {
  try {
    const statuses = [
      {
        id: 'new',
        name: 'New',
        description: 'New order, not yet processed',
        order: 1,
        color: 'blue'
      },
      {
        id: 'processing',
        name: 'Processing',
        description: 'Order is being processed',
        order: 2,
        color: 'orange'
      },
      {
        id: 'completed',
        name: 'Completed',
        description: 'Order has been completed',
        order: 3,
        color: 'green'
      },
      {
        id: 'cancelled',
        name: 'Cancelled',
        description: 'Order has been cancelled',
        order: 4,
        color: 'red'
      }
    ];

    for (const status of statuses) {
      const { id, ...statusData } = status;
      const statusRef = doc(collection(db, 'orderStatuses'), id);
      await setDoc(statusRef, statusData);
    }
    console.log('Order statuses created successfully');
  } catch (error) {
    console.error('Error creating order statuses:', error);
  }
}

// Main function to initialize everything
async function initializeFirestore() {
  try {
    console.log('Starting Firestore initialization...');
    await createAdminUser();
    await createSampleProducts();
    await createAppSettings();
    await createOrderStatuses();
    console.log('Firestore initialization completed successfully!');
    setTimeout(() => process.exit(0), 2000); // Give time for operations to complete
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeFirestore(); 