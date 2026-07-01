// This script will create the necessary Firestore data using the Firebase CLI
// You need to be logged in with firebase login

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create temporary JSON files
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
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
fs.writeFileSync(path.join(tempDir, 'admin.json'), JSON.stringify(adminUser, null, 2));

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
fs.writeFileSync(path.join(tempDir, 'app-settings.json'), JSON.stringify(appSettings, null, 2));

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

// Create a combined data.json file for importing
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

const dataFilePath = path.join(tempDir, 'firestore-data.json');
fs.writeFileSync(dataFilePath, JSON.stringify(firestoreData, null, 2));

console.log('Creating Firestore collections...');

try {
  // Start the Firebase emulator
  console.log('Starting Firebase emulators...');
  execSync(`export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use 20 && firebase emulators:start --only firestore`, { 
    stdio: 'inherit',
    detached: true
  });
  
  // Import data into emulator
  console.log('Importing data into Firestore...');
  execSync(`export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use 20 && firebase emulators:exec --only firestore "echo 'Data imported successfully!'"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      FIRESTORE_EMULATOR_IMPORT: dataFilePath
    }
  });

  console.log('Firestore initialization completed successfully!');
} catch (error) {
  console.error('Error initializing Firestore:', error);
  process.exit(1);
} finally {
  // Clean up temporary files
  fs.rmSync(tempDir, { recursive: true, force: true });
} 