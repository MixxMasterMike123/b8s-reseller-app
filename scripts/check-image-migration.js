// Check current state of product images in database
// This script will identify products that still have base64 data instead of Firebase Storage URLs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBp-8_rlPLB6lWVhPTf_x_mjhF4YV85hGU",
  authDomain: "b8shield-reseller-app.firebaseapp.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.appspot.com",
  messagingSenderId: "873938415996",
  appId: "1:873938415996:web:ac25f08b0b47f28cfb8df8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db'); // Use named database

async function checkImageMigrationStatus() {
  console.log('🔍 Checking product image migration status...\n');

  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    if (snapshot.empty) {
      console.log('❌ No products found in database');
      return;
    }

    let totalProducts = 0;
    let base64Images = 0;
    let firebaseStorageImages = 0;
    let noImages = 0;
    let legacyBase64Data = 0;

    console.log('📊 Product Image Analysis:');
    console.log('='.repeat(50));

    snapshot.forEach((doc) => {
      const product = doc.data();
      totalProducts++;

      console.log(`\n📦 ${product.name} (${product.sku})`);
      
      // Check main imageUrl field
      if (product.imageUrl) {
        if (product.imageUrl.startsWith('data:image/')) {
          console.log(`   ❌ imageUrl: BASE64 (${product.imageUrl.length} chars)`);
          base64Images++;
        } else if (product.imageUrl.includes('firebasestorage.googleapis.com')) {
          console.log(`   ✅ imageUrl: Firebase Storage`);
          firebaseStorageImages++;
        } else {
          console.log(`   ⚠️  imageUrl: Other (${product.imageUrl.substring(0, 100)}...)`);
        }
      } else {
        console.log(`   ⚪ imageUrl: None`);
        noImages++;
      }

      // Check legacy base64 fields
      if (product.imageData) {
        console.log(`   🗂️  Legacy imageData: ${product.imageData.length} chars (SHOULD BE REMOVED)`);
        legacyBase64Data++;
      }

      // Check other image fields
      if (product.eanImagePngUrl && product.eanImagePngUrl.startsWith('data:image/')) {
        console.log(`   ❌ eanImagePngUrl: BASE64`);
      } else if (product.eanImagePngUrl) {
        console.log(`   ✅ eanImagePngUrl: Firebase Storage`);
      }

      if (product.eanImageSvgUrl && product.eanImageSvgUrl.startsWith('data:image/')) {
        console.log(`   ❌ eanImageSvgUrl: BASE64`);
      } else if (product.eanImageSvgUrl) {
        console.log(`   ✅ eanImageSvgUrl: Firebase Storage`);
      }

      if (product.b2bImageUrl && product.b2bImageUrl.includes('firebasestorage.googleapis.com')) {
        console.log(`   ✅ b2bImageUrl: Firebase Storage`);
      } else if (product.b2bImageUrl) {
        console.log(`   ❌ b2bImageUrl: Not Firebase Storage`);
      }

      if (product.b2cImageUrl && product.b2cImageUrl.includes('firebasestorage.googleapis.com')) {
        console.log(`   ✅ b2cImageUrl: Firebase Storage`);
      } else if (product.b2cImageUrl) {
        console.log(`   ❌ b2cImageUrl: Not Firebase Storage`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('📈 MIGRATION SUMMARY:');
    console.log(`Total Products: ${totalProducts}`);
    console.log(`❌ Base64 Images: ${base64Images}`);
    console.log(`✅ Firebase Storage Images: ${firebaseStorageImages}`);
    console.log(`⚪ No Images: ${noImages}`);
    console.log(`🗂️  Legacy imageData fields: ${legacyBase64Data}`);
    
    if (base64Images > 0) {
      console.log('\n🚨 MIGRATION NEEDED:');
      console.log(`${base64Images} products still have base64 images in imageUrl field!`);
      console.log('These need to be converted to Firebase Storage URLs.');
    }

    if (legacyBase64Data > 0) {
      console.log('\n🧹 CLEANUP NEEDED:');
      console.log(`${legacyBase64Data} products still have legacy imageData fields!`);
      console.log('These should be removed for better performance.');
    }

  } catch (error) {
    console.error('Error checking migration status:', error);
  }
}

checkImageMigrationStatus(); 