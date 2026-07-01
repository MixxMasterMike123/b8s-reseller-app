// This script generates a properly formatted JSON file for importing directly
// through the Firebase Console's Import/Export feature

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../temp');
const outputFile = path.join(outputDir, 'firestore-import.json');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Admin user
const adminUser = {
  email: 'admin@b8shield.com',
  companyName: 'B8shield Admin',
  role: 'admin',
  isActive: true,
  contactPerson: 'Admin User',
  phone: '+46123456789'
};

// Products
const products = [
  {
    name: 'B8shield Basic',
    description: 'Basic security solution for small businesses',
    price: 499,
    isActive: true
  },
  {
    name: 'B8shield Pro',
    description: 'Advanced security solution with extended features',
    price: 999,
    isActive: true
  },
  {
    name: 'B8shield Enterprise',
    description: 'Complete security solution for large organizations',
    price: 1999,
    isActive: true
  }
];

// App settings
const appSettings = {
  orderNumberPrefix: 'B8-',
  orderStartNumber: 1000,
  companyName: 'B8shield AB',
  companyEmail: 'info@b8shield.com',
  companyPhone: '+46123456789',
  companyAddress: 'Stockholm, Sweden'
};

// Order statuses
const orderStatuses = [
  {
    name: 'New',
    description: 'New order, not yet processed',
    order: 1,
    color: 'blue'
  },
  {
    name: 'Processing',
    description: 'Order is being processed',
    order: 2,
    color: 'orange'
  },
  {
    name: 'Completed',
    description: 'Order has been completed',
    order: 3,
    color: 'green'
  },
  {
    name: 'Cancelled',
    description: 'Order has been cancelled',
    order: 4,
    color: 'red'
  }
];

// Create a properly formatted data structure for Firestore import
const firestoreData = {
  __collections__: {
    users: {
      admin: {
        ...adminUser,
        __collections__: {}
      }
    },
    products: {
      'prod-001': {
        ...products[0],
        __collections__: {}
      },
      'prod-002': {
        ...products[1],
        __collections__: {}
      },
      'prod-003': {
        ...products[2],
        __collections__: {}
      }
    },
    settings: {
      app: {
        ...appSettings,
        __collections__: {}
      }
    },
    orderStatuses: {
      new: {
        ...orderStatuses[0],
        __collections__: {}
      },
      processing: {
        ...orderStatuses[1],
        __collections__: {}
      },
      completed: {
        ...orderStatuses[2],
        __collections__: {}
      },
      cancelled: {
        ...orderStatuses[3],
        __collections__: {}
      }
    }
  }
};

// Write the data to a JSON file
fs.writeFileSync(outputFile, JSON.stringify(firestoreData, null, 2));

console.log(`Firestore import data generated at: ${outputFile}`);
console.log('\nInstructions:');
console.log('1. Go to Firebase Console > Firestore Database');
console.log('2. Click on "Export / Import" button');
console.log('3. Select "Import"');
console.log(`4. Upload the generated file: ${outputFile}`);
console.log('5. Click "Import" to load all collections and documents'); 