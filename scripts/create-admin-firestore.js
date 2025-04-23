// This script creates an admin user document in Firestore
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));

// Your UID from previous script
const USER_UID = '9AudFilG8VeYHcFnKgUtQkByAmn1';

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Firestore with the specific database
const db = admin.firestore();
db.settings({
  databaseId: 'b8s-reseller-db'
});

// Create the admin document
db.collection('users').doc(USER_UID).set({
  email: 'micke.ohlen@gmail.com',
  companyName: 'B8shield Admin',
  role: 'admin',
  isActive: true,
  contactPerson: 'Admin User',
  phone: '+46123456789',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
})
.then(() => {
  console.log('Admin user document created successfully!');
  process.exit(0);
})
.catch((error) => {
  console.error('Error creating admin document:', error);
  process.exit(1);
}); 