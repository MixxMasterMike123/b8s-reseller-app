import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
initializeApp({
  projectId: 'b8shield-reseller-app'
});

// Get Firestore instance
const db = getFirestore();

// Create user data in default database
const userData = {
  email: 'micke.ohlen@gmail.com',
  companyName: 'B8shield Admin',
  contactPerson: 'Admin User',
  phoneNumber: '+1234567890',
  address: 'Admin Address',
  role: 'admin',
  active: true,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

try {
  await db.collection('users').doc('9AudFilG8VeYHcFnKgUtQkByAmn1').set(userData);
  console.log('User created successfully');
} catch (err) {
  console.error('Error creating user:', err);
} 