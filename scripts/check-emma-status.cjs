const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://b8s-reseller-db-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.firestore();

async function checkEmma() {
  try {
    console.log('🔍 Checking Emma Mattsdal\'s affiliate status...');
    
    // Check affiliates collection
    const affiliatesRef = db.collection('affiliates');
    const snapshot = await affiliatesRef.where('email', '==', 'e.mattsdal@gmail.com').get();
    
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('📄 Emma found in affiliates:');
        console.log('  Document ID:', doc.id);
        console.log('  Status:', data.status);
        console.log('  Email:', data.email);
        console.log('  Name:', data.name);
        console.log('  Affiliate Code:', data.affiliateCode);
        console.log('  Commission Rate:', data.commissionRate);
        console.log('  Created At:', data.createdAt);
        console.log('  Updated At:', data.updatedAt);
      });
    } else {
      console.log('❌ Emma not found in affiliates collection');
      
      // Check if she's in applications instead
      const appsRef = db.collection('affiliateApplications');
      const appSnapshot = await appsRef.where('email', '==', 'e.mattsdal@gmail.com').get();
      
      if (!appSnapshot.empty) {
        appSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('📄 Emma found in affiliateApplications (not activated):');
          console.log('  Document ID:', doc.id);
          console.log('  Email:', data.email);
          console.log('  Name:', data.name);
          console.log('  Created At:', data.createdAt);
        });
      } else {
        console.log('❌ Emma not found in affiliateApplications either');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkEmma(); 