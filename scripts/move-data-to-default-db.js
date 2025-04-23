// This script moves data from the named database to the default database
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Source database (with database ID)
const sourceDb = admin.firestore();
sourceDb.settings({
  databaseId: 'b8s-reseller-db'
});

// Target database (default)
const targetDb = admin.firestore();

// Collections to copy
const collections = ['users', 'products', 'settings', 'orderStatuses'];

// Migrate data function
async function migrateData() {
  try {
    for (const collectionName of collections) {
      console.log(`Migrating collection: ${collectionName}`);
      
      // Get all documents from source collection
      const sourceSnapshot = await sourceDb.collection(collectionName).get();
      
      // Copy each document to target collection
      const promises = sourceSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        console.log(`Copying document: ${collectionName}/${doc.id}`);
        
        // Special handling for the admin user - make sure to use the auth ID
        if (collectionName === 'users' && doc.id === 'admin') {
          // Check if we already created a user with Firebase Auth
          const authUser = await admin.auth().getUserByEmail('micke.ohlen@gmail.com')
            .catch(() => null);
          
          if (authUser) {
            console.log(`Found auth user with ID: ${authUser.uid}, using this ID instead of 'admin'`);
            return targetDb.collection(collectionName).doc(authUser.uid).set(data);
          }
        }
        
        return targetDb.collection(collectionName).doc(doc.id).set(data);
      });
      
      await Promise.all(promises);
      console.log(`Finished migrating collection: ${collectionName}`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run migration
migrateData().then(() => {
  console.log('Migration process finished');
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 