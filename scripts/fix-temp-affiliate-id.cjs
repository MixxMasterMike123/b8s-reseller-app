const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, addDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCsYgMVRlipm-PxsHPZOxew5tqcZ_3Kccw",
  authDomain: "shop.b8shield.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.firebasestorage.app",
  messagingSenderId: "996315128348",
  appId: "1:996315128348:web:75388494e2bcdfa1f3f5d9",
  measurementId: "G-7JFF08MLM2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db');

async function fixTempAffiliateId() {
  const tempId = 'temp_1753191922944';
  
  try {
    console.log('🔍 Fetching affiliate with temp ID:', tempId);
    
    // Get the affiliate document with temp ID
    const affiliateDoc = await getDoc(doc(db, 'affiliates', tempId));
    
    if (!affiliateDoc.exists()) {
      console.log('❌ Affiliate document not found');
      return;
    }
    
    const affiliateData = affiliateDoc.data();
    console.log('📄 Found affiliate data:', {
      name: affiliateData.name,
      email: affiliateData.email,
      affiliateCode: affiliateData.affiliateCode
    });
    
    // Create new document with proper ID
    console.log('🆔 Creating new document with proper Firebase ID...');
    const newDocRef = await addDoc(collection(db, 'affiliates'), affiliateData);
    const newId = newDocRef.id;
    
    console.log('✅ New document created with ID:', newId);
    
    // Delete the old document with temp ID
    console.log('🗑️ Deleting old document with temp ID...');
    await deleteDoc(doc(db, 'affiliates', tempId));
    
    console.log('✅ Successfully migrated affiliate:');
    console.log('   Old ID:', tempId);
    console.log('   New ID:', newId);
    console.log('   New URL:', `https://partner.b8shield.com/admin/affiliates/manage/${newId}`);
    
  } catch (error) {
    console.error('❌ Error fixing temp affiliate ID:', error);
  }
}

// Run the fix
fixTempAffiliateId(); 