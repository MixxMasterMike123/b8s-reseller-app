// Script to add B8 Shield products to Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Verify environment variables are loaded
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration variables are missing. Make sure .env file is properly configured.');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Product data from aterforsaljare-portal.tsx
const products = [
  {
    id: 'b8shield-base',
    name: 'B8 Shield',
    description: 'B8 Shield protection for smartphones',
    basePrice: 71.2, // 89 SEK including VAT (89 / 1.25)
    manufacturingCost: 10,
    defaultMargin: 35,
    variants: [
      // Colors
      {
        type: 'color',
        options: [
          { id: 'transparent', name: 'Transparent' },
          { id: 'rod', name: 'Röd' },
          { id: 'florerande', name: 'Florerande' },
          { id: 'glitter', name: 'Glitter' }
        ]
      },
      // Sizes
      {
        type: 'size',
        options: [
          { id: 'storlek2', name: 'Storlek 2' },
          { id: 'storlek4', name: 'Storlek 4' },
          { id: 'storlek6', name: 'Storlek 6' }
        ]
      }
    ],
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

// Settings
const settings = {
  id: 'product-settings',
  FORSALJNINGSPRIS_INKL_MOMS: 89,
  TILLVERKNINGSKOSTNAD: 10,
  DEFAULT_MARGINAL: 35,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

// Add products to Firestore
async function addProducts() {
  try {
    console.log('Adding products to Firestore...');
    
    // First, check if products already exist to avoid duplicates
    const productsQuery = query(collection(db, 'products'), where('name', '==', 'B8 Shield'));
    const productsSnapshot = await getDocs(productsQuery);
    
    if (!productsSnapshot.empty) {
      console.log('Products already exist. Deleting existing products...');
      const deletePromises = [];
      productsSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      console.log('Existing products deleted.');
    }
    
    // Add new products
    for (const product of products) {
      const docRef = await addDoc(collection(db, 'products'), product);
      console.log(`Product added with ID: ${docRef.id}`);
    }
    
    // Add settings
    const settingsQuery = query(collection(db, 'settings'), where('id', '==', 'product-settings'));
    const settingsSnapshot = await getDocs(settingsQuery);
    
    if (!settingsSnapshot.empty) {
      console.log('Settings already exist. Deleting existing settings...');
      const deletePromises = [];
      settingsSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      console.log('Existing settings deleted.');
    }
    
    const settingsRef = await addDoc(collection(db, 'settings'), settings);
    console.log(`Settings added with ID: ${settingsRef.id}`);
    
    console.log('Products and settings successfully added to Firestore!');
  } catch (error) {
    console.error('Error adding products to Firestore:', error);
    process.exit(1);
  }
}

// Run the script
addProducts(); 