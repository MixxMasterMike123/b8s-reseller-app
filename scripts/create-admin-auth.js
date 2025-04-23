// This script creates an admin user in Firebase Authentication
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

// Create user
admin.auth().createUser({
  email: 'micke.ohlen@gmail.com',
  password: 'temporaryPassword123',
  emailVerified: true
})
.then((userRecord) => {
  console.log('Successfully created user:', userRecord.uid);
  
  // Get existing admin document
  return admin.firestore().collection('users').doc('admin').get()
    .then((doc) => {
      if (doc.exists) {
        console.log('Found admin document, copying data to:', userRecord.uid);
        // Create new document with auth UID and existing data
        return admin.firestore().collection('users').doc(userRecord.uid).set(doc.data());
      } else {
        console.log('Admin document does not exist');
        throw new Error('Admin document not found');
      }
    })
    .then(() => {
      console.log('Migrated admin data to new user document');
      
      // Update Firestore document with correct field name
      return admin.firestore().collection('users').doc(userRecord.uid).update({
        isActive: true
      });
    });
})
.then(() => {
  console.log('Admin user setup complete');
  process.exit(0);
})
.catch((error) => {
  console.error('Error creating user:', error);
  process.exit(1);
}); 