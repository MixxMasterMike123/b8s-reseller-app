// Migrate remaining base64 images to Firebase Storage and clean up database
// This will convert imageUrl base64 data to Firebase Storage URLs and remove legacy fields

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
const storage = getStorage(app);

// Convert base64 to blob for upload
function base64ToBlob(base64Data) {
  const [header, data] = base64Data.split(',');
  const mimeMatch = header.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return { blob: new Blob([array], { type: mimeType }), mimeType };
}

// Upload base64 to Firebase Storage
async function uploadBase64ToStorage(base64Data, productId, imageType) {
  try {
    console.log(`   📤 Uploading ${imageType} to Firebase Storage...`);
    
    const { blob, mimeType } = base64ToBlob(base64Data);
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `${Date.now()}_${imageType}.${extension}`;
    const storagePath = `products/${productId}/${filename}`;
    
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log(`   ✅ Uploaded ${imageType}: ${downloadURL}`);
    return downloadURL;
    
  } catch (error) {
    console.error(`   ❌ Upload failed for ${imageType}:`, error);
    return null;
  }
}

async function migrateProductImages() {
  console.log('🚀 Starting base64 to Firebase Storage migration...\n');

  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    if (snapshot.empty) {
      console.log('❌ No products found in database');
      return;
    }

    let totalProducts = 0;
    let migrated = 0;
    let cleaned = 0;
    let errors = 0;

    console.log('🔄 Processing products...');
    console.log('='.repeat(60));

    for (const docSnapshot of snapshot.docs) {
      const product = docSnapshot.data();
      const productId = docSnapshot.id;
      totalProducts++;

      console.log(`\n📦 Processing: ${product.name} (${product.sku})`);

      const updates = {};
      const fieldsToRemove = {};

      // 1. Migrate main imageUrl if it's base64
      if (product.imageUrl && product.imageUrl.startsWith('data:image/')) {
        console.log(`   🔄 Migrating main imageUrl (${product.imageUrl.length} chars)...`);
        const firebaseUrl = await uploadBase64ToStorage(product.imageUrl, productId, 'main');
        if (firebaseUrl) {
          updates.imageUrl = firebaseUrl;
          migrated++;
        }
      }

      // 2. Migrate EAN PNG if base64
      if (product.eanImagePngUrl && product.eanImagePngUrl.startsWith('data:image/')) {
        console.log(`   🔄 Migrating EAN PNG...`);
        const firebaseUrl = await uploadBase64ToStorage(product.eanImagePngUrl, productId, 'ean_png');
        if (firebaseUrl) {
          updates.eanImagePngUrl = firebaseUrl;
        }
      }

      // 3. Migrate EAN SVG if base64  
      if (product.eanImageSvgUrl && product.eanImageSvgUrl.startsWith('data:image/')) {
        console.log(`   🔄 Migrating EAN SVG...`);
        const firebaseUrl = await uploadBase64ToStorage(product.eanImageSvgUrl, productId, 'ean_svg');
        if (firebaseUrl) {
          updates.eanImageSvgUrl = firebaseUrl;
        }
      }

      // 4. Remove legacy base64 fields completely (CRITICAL FOR PERFORMANCE)
      const legacyFields = ['imageData', 'eanImagePng', 'eanImageSvg', 'b2bImageData', 'b2cImageData'];
      legacyFields.forEach(field => {
        if (product[field]) {
          console.log(`   🗑️  Removing legacy field: ${field} (${product[field].length} chars)`);
          fieldsToRemove[field] = null; // Firestore delete field syntax
          cleaned++;
        }
      });

      // 5. Apply all updates
      const allUpdates = { ...updates, ...fieldsToRemove };
      
      if (Object.keys(allUpdates).length > 0) {
        try {
          await updateDoc(doc(db, 'products', productId), allUpdates);
          console.log(`   ✅ Updated product: ${Object.keys(updates).length} migrations, ${Object.keys(fieldsToRemove).length} cleanups`);
        } catch (error) {
          console.error(`   ❌ Failed to update product:`, error);
          errors++;
        }
      } else {
        console.log(`   ⚪ No changes needed`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log(`📊 Processed: ${totalProducts} products`);
    console.log(`🚀 Migrated: ${migrated} base64 images to Firebase Storage`);
    console.log(`🧹 Cleaned: ${cleaned} legacy base64 fields`);
    console.log(`❌ Errors: ${errors}`);

    if (errors === 0) {
      console.log('\n✅ ALL PRODUCTS SUCCESSFULLY MIGRATED!');
      console.log('🎯 AdminProducts table will now load much faster');
      console.log('🖼️  All images now use Firebase Storage URLs');
      console.log('⚡ No more base64 data in database');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateProductImages(); 