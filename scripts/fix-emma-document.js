import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

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

async function fixEmmaDocument() {
  try {
    console.log('🔍 Looking for Emma Mattsdal in affiliates...');
    
    // Find Emma's affiliate record
    const affiliatesRef = collection(db, 'affiliates');
    const q = query(affiliatesRef, where('email', '==', 'e.mattsdal@gmail.com'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Emma Mattsdal not found in affiliates');
      return;
    }
    
    const emmaDoc = snapshot.docs[0];
    const emmaData = emmaDoc.data();
    
    console.log(`✅ Found Emma: ${emmaData.name} (${emmaData.email})`);
    console.log(`📄 Current document ID: ${emmaDoc.id}`);
    console.log(`🆔 Firebase Auth UID: ${emmaData.id || 'MISSING'}`);
    
    if (!emmaData.id) {
      console.log('❌ Emma has no Firebase Auth UID - cannot fix');
      return;
    }
    
    if (emmaDoc.id === emmaData.id) {
      console.log('✅ Emma already has correct document structure');
      return;
    }
    
    console.log('🔧 Fixing Emma\'s document structure...');
    
    // Create new document with Firebase Auth UID as document ID
    const newDocRef = doc(db, 'affiliates', emmaData.id);
    await setDoc(newDocRef, {
      ...emmaData,
      id: emmaData.id, // Ensure the id field matches the document ID
      updatedAt: new Date()
    });
    
    console.log(`✅ Created new document with ID: ${emmaData.id}`);
    
    // Delete the old document
    await deleteDoc(emmaDoc.ref);
    console.log(`🗑️  Deleted old document with ID: ${emmaDoc.id}`);
    
    console.log('\n🎯 Emma\'s document is now fixed!');
    console.log(`   🔗 New URL: /admin/affiliates/manage/${emmaData.id}`);
    console.log(`   📊 All data preserved: ${emmaData.stats?.balance || 0} kr balance`);
    
  } catch (error) {
    console.error('❌ Error fixing Emma document:', error);
  }
}

fixEmmaDocument(); 