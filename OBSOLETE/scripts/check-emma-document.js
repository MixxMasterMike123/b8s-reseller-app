const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://b8s-reseller-db-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.firestore();

async function checkEmma() {
  try {
    console.log('🔍 Checking for Emma Mattsdal in database...\n');
    
    // Check affiliates collection
    const affiliatesRef = db.collection('affiliates');
    const snapshot = await affiliatesRef.where('email', '==', 'e.mattsdal@gmail.com').get();
    
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        console.log('📄 Emma found in affiliates collection:');
        console.log('  Document ID:', doc.id);
        console.log('  Email:', doc.data().email);
        console.log('  Name:', doc.data().name);
        console.log('  Affiliate Code:', doc.data().affiliateCode);
        console.log('  Status:', doc.data().status);
        console.log('  Firebase Auth UID (id field):', doc.data().id);
        console.log('');
      });
    } else {
      console.log('❌ Emma not found in affiliates collection\n');
    }
    
    // Also check affiliateApplications
    const appsRef = db.collection('affiliateApplications');
    const appSnapshot = await appsRef.where('email', '==', 'e.mattsdal@gmail.com').get();
    
    if (!appSnapshot.empty) {
      appSnapshot.forEach(doc => {
        console.log('📄 Emma found in affiliateApplications collection:');
        console.log('  Document ID:', doc.id);
        console.log('  Email:', doc.data().email);
        console.log('  Name:', doc.data().name);
        console.log('');
      });
    } else {
      console.log('❌ Emma not found in affiliateApplications collection\n');
    }
    
    // Check what URL would be generated for Emma
    console.log('🔗 URL Analysis:');
    console.log('  Bill Kallberg URL: https://partner.b8shield.com/admin/affiliates/manage/EFbSHLocwCk5nMFSAEC8');
    console.log('  Bill\'s document ID: EFbSHLocwCk5nMFSAEC8');
    console.log('');
    
    if (!snapshot.empty) {
      const emmaDoc = snapshot.docs[0];
      console.log('  Emma\'s document ID:', emmaDoc.id);
      console.log('  Emma\'s URL would be: https://partner.b8shield.com/admin/affiliates/manage/' + emmaDoc.id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkEmma(); 