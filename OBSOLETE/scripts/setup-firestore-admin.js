import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to your service account key file
// IMPORTANT: Replace this with the path to your downloaded service account key
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || join(__dirname, '../serviceAccountKey.json');

try {
  // Load the service account key JSON file
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  // Initialize the app with a service account
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1);
}

const db = admin.firestore();

// Helper function for timestamps
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// Create admin user
async function createAdminUser() {
  try {
    await db.collection('users').doc('admin').set({
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

    const batch = db.batch();
    for (const product of products) {
      const { id, ...productData } = product;
      batch.set(db.collection('products').doc(id), productData);
    }
    await batch.commit();
    console.log('Sample products created successfully');
  } catch (error) {
    console.error('Error creating sample products:', error);
  }
}

// Create app settings
async function createAppSettings() {
  try {
    await db.collection('settings').doc('app').set({
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

    const batch = db.batch();
    for (const status of statuses) {
      const { id, ...statusData } = status;
      batch.set(db.collection('orderStatuses').doc(id), statusData);
    }
    await batch.commit();
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
    process.exit(0);
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeFirestore(); 