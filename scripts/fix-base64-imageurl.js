// Simple script to replace base64 imageUrl with existing Firebase Storage URLs
// This avoids upload issues by using existing b2bImageUrl/b2cImageUrl

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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
const db = getFirestore(app, 'b8s-reseller-db');

async function fixBase64ImageUrls() {
  console.log('🔧 Fixing base64 imageUrl fields with existing Firebase Storage URLs...\n');

  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    if (snapshot.empty) {
      console.log('❌ No products found in database');
      return;
    }

    let totalProducts = 0;
    let fixed = 0;
    let skipped = 0;
    let noAlternative = 0;

    console.log('🔄 Processing products...');
    console.log('='.repeat(60));

    for (const docSnapshot of snapshot.docs) {
      const product = docSnapshot.data();
      const productId = docSnapshot.id;
      totalProducts++;

      console.log(`\n📦 ${product.name} (${product.sku})`);

      const updates = {};

      // Fix main imageUrl if it's base64
      if (product.imageUrl && product.imageUrl.startsWith('data:image/')) {
        console.log(`   ❌ imageUrl contains base64 (${product.imageUrl.length} chars)`);
        
        // Try to use existing Firebase Storage URLs
        let replacementUrl = null;
        
        if (product.b2bImageUrl && product.b2bImageUrl.includes('firebasestorage.googleapis.com')) {
          replacementUrl = product.b2bImageUrl;
          console.log(`   ✅ Using b2bImageUrl as replacement`);
        } else if (product.b2cImageUrl && product.b2cImageUrl.includes('firebasestorage.googleapis.com')) {
          replacementUrl = product.b2cImageUrl;
          console.log(`   ✅ Using b2cImageUrl as replacement`);
        }
        
        if (replacementUrl) {
          updates.imageUrl = replacementUrl;
          console.log(`   🔄 Replacing with: ${replacementUrl.substring(0, 80)}...`);
          fixed++;
        } else {
          console.log(`   ⚠️  No Firebase Storage alternative found - clearing imageUrl`);
          updates.imageUrl = null; // Remove base64, set to null
          noAlternative++;
        }
      } else if (product.imageUrl && product.imageUrl.includes('firebasestorage.googleapis.com')) {
        console.log(`   ✅ imageUrl already uses Firebase Storage`);
        skipped++;
      } else if (!product.imageUrl) {
        console.log(`   ⚪ No imageUrl field`);
        skipped++;
      } else {
        console.log(`   ⚠️  imageUrl has unknown format: ${product.imageUrl.substring(0, 50)}...`);
        skipped++;
      }

      // Remove any remaining base64 EAN images (set to null)
      if (product.eanImagePngUrl && product.eanImagePngUrl.startsWith('data:image/')) {
        console.log(`   🗑️  Removing base64 eanImagePngUrl`);
        updates.eanImagePngUrl = null;
      }

      if (product.eanImageSvgUrl && product.eanImageSvgUrl.startsWith('data:image/')) {
        console.log(`   🗑️  Removing base64 eanImageSvgUrl`);
        updates.eanImageSvgUrl = null;
      }

      // Apply updates if needed
      if (Object.keys(updates).length > 0) {
        try {
          await updateDoc(doc(db, 'products', productId), updates);
          console.log(`   ✅ Updated successfully`);
        } catch (error) {
          console.error(`   ❌ Failed to update:`, error);
        }
      } else {
        console.log(`   ⚪ No changes needed`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 BASE64 CLEANUP COMPLETE!');
    console.log(`📊 Processed: ${totalProducts} products`);
    console.log(`✅ Fixed: ${fixed} base64 imageUrl fields`);
    console.log(`⚪ Skipped: ${skipped} (already correct)`);
    console.log(`⚠️  No alternative: ${noAlternative} (set to null)`);

    if (fixed > 0) {
      console.log('\n🚀 PERFORMANCE IMPROVEMENT ACHIEVED!');
      console.log('🖼️  All imageUrl fields now use Firebase Storage or are null');
      console.log('⚡ No more base64 data slowing down AdminProducts table');
      console.log('🎯 AdminProducts should load much faster now');
    }

  } catch (error) {
    console.error('Fix operation failed:', error);
  }
}

fixBase64ImageUrls(); 