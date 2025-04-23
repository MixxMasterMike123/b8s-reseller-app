// This script directly uploads data to Firestore using the Firebase Admin SDK
// Run with: node scripts/direct-upload.js

// Import Firebase Admin SDK using ES module syntax
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the service account file from the root directory
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

console.log('Firebase Configuration:', {
  projectId: serviceAccount.project_id,
  databaseName: 'b8s-reseller-db'
});

// Initialize Firebase Admin with service account
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

// Get Firestore database reference with specific database name
const db = getFirestore(app, 'b8s-reseller-db');

console.log('Connected to Firestore database: b8s-reseller-db');

// Function to create an admin user
async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    const userRef = db.collection('users').doc('admin123');
    
    await userRef.set({
      email: 'admin@b8shield.com',
      displayName: 'Admin User',
      role: 'admin',
      companyName: 'B8Shield',
      contactPerson: 'Admin',
      phoneNumber: '+1234567890',
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    console.log('Admin user created successfully');
    return true;
  } catch (error) {
    console.error('Error creating admin user:', error.message, error.code);
    return false;
  }
}

// Create sample products
async function createSampleProducts() {
  try {
    console.log('Creating sample products...');
    const products = [
      {
        id: 'prod_001',
        name: 'B8Shield Basic',
        description: 'Basic security package',
        price: 99.99,
        features: ['24/7 monitoring', 'Email alerts'],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isActive: true,
      },
      {
        id: 'prod_002',
        name: 'B8Shield Pro',
        description: 'Professional security package',
        price: 199.99,
        features: ['24/7 monitoring', 'Email alerts', 'SMS alerts', 'Weekly reports'],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isActive: true,
      },
      {
        id: 'prod_003',
        name: 'B8Shield Enterprise',
        description: 'Enterprise security package',
        price: 499.99,
        features: [
          '24/7 monitoring',
          'Email alerts',
          'SMS alerts',
          'Weekly reports',
          'Dedicated support',
          'Custom integrations',
        ],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isActive: true,
      },
    ];

    const batch = db.batch();
    products.forEach((product) => {
      const productRef = db.collection('products').doc(product.id);
      batch.set(productRef, product);
    });

    await batch.commit();
    console.log('Sample products created successfully');
    return true;
  } catch (error) {
    console.error('Error creating sample products:', error.message, error.code || '');
    return false;
  }
}

// Create app settings
async function createAppSettings() {
  try {
    console.log('Creating app settings...');
    const settingsRef = db.collection('settings').doc('app');
    await settingsRef.set({
      companyName: 'B8Shield',
      supportEmail: 'support@b8shield.com',
      supportPhone: '+1234567890',
      orderPrefix: 'B8S',
      lastOrderNumber: 1000,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log('App settings created successfully');
    return true;
  } catch (error) {
    console.error('Error creating app settings:', error.message, error.code || '');
    return false;
  }
}

// Create order statuses
async function createOrderStatuses() {
  try {
    console.log('Creating order statuses...');
    const statuses = [
      {
        id: 'status_new',
        name: 'New',
        description: 'Order has been placed but not yet processed',
        color: '#3498db',
        order: 1,
        isDefault: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      {
        id: 'status_processing',
        name: 'Processing',
        description: 'Order is being processed',
        color: '#f39c12',
        order: 2,
        isDefault: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      {
        id: 'status_shipped',
        name: 'Shipped',
        description: 'Order has been shipped',
        color: '#2ecc71',
        order: 3,
        isDefault: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      {
        id: 'status_delivered',
        name: 'Delivered',
        description: 'Order has been delivered',
        color: '#27ae60',
        order: 4,
        isDefault: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      {
        id: 'status_cancelled',
        name: 'Cancelled',
        description: 'Order has been cancelled',
        color: '#e74c3c',
        order: 5,
        isDefault: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
    ];

    const batch = db.batch();
    statuses.forEach((status) => {
      const statusRef = db.collection('orderStatuses').doc(status.id);
      batch.set(statusRef, status);
    });

    await batch.commit();
    console.log('Order statuses created successfully');
    return true;
  } catch (error) {
    console.error('Error creating order statuses:', error.message, error.code || '');
    return false;
  }
}

// Main function to initialize Firestore data
async function initializeFirestore() {
  console.log('Starting Firestore initialization...');
  
  try {
    const adminCreated = await createAdminUser();
    if (!adminCreated) {
      console.error('Failed to create admin user. Stopping initialization.');
      process.exit(1);
    }
    
    const productsCreated = await createSampleProducts();
    const settingsCreated = await createAppSettings();
    const statusesCreated = await createOrderStatuses();
    
    if (productsCreated && settingsCreated && statusesCreated) {
      console.log('Firestore initialization completed successfully!');
      process.exit(0);
    } else {
      console.error('Firestore initialization completed with errors. Check the logs above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Unhandled error during initialization:', error);
    process.exit(1);
  }
}

// Run initialization
initializeFirestore().catch(error => {
  console.error('Unhandled error during initialization:', error);
  process.exit(1);
}); 