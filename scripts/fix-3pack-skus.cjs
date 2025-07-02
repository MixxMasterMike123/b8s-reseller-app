const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGZ7s9DZR0w_Pce7uo1oGhUJOJdK5N9QY",
  authDomain: "b8shield-reseller-app.firebaseapp.com",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.appspot.com",
  messagingSenderId: "1012659474848",
  appId: "1:1012659474848:web:c0b1c2a3d4e5f6g7h8i9j0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db');

// Specific SKU corrections for 3-pack products
const SKU_CORRECTIONS = {
  'B8Shield™ – Vasskydd 3-pack - Transparant': 'B8S-3p-tr',
  'B8Shield™ – Vasskydd 3-pack - Glitter': 'B8S-3p-gl',
  'B8Shield™ – Vasskydd 3-pack - Röd': 'B8S-3p-re',
  'B8Shield™ – Vasskydd 3-pack - Flourocent': 'B8S-3p-fl', // Note: correcting the typo "Flourocent"
};

async function fix3PackSKUs() {
  try {
    console.log('🔧 Starting 3-pack SKU correction process...');
    console.log('📊 Connecting to Firestore database: b8s-reseller-db');
    
    // Get all products
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    
    console.log(`📦 Found ${querySnapshot.size} products to check`);
    
    let correctedCount = 0;
    
    // Process each product
    for (const docSnap of querySnapshot.docs) {
      const productData = docSnap.data();
      const productId = docSnap.id;
      const productName = productData.name;
      
      // Check if this product needs SKU correction
      if (SKU_CORRECTIONS[productName]) {
        const correctSKU = SKU_CORRECTIONS[productName];
        
        console.log(`\n🔄 Correcting product: ${productId}`);
        console.log(`   Name: ${productName}`);
        console.log(`   Current SKU: ${productData.sku}`);
        console.log(`   Correct SKU: ${correctSKU}`);
        
        // Update the product with the correct SKU
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, {
          sku: correctSKU,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`   ✅ Corrected to: ${correctSKU}`);
        correctedCount++;
      }
    }
    
    console.log(`\n🎉 3-pack SKU correction completed!`);
    console.log(`   ✅ Corrected: ${correctedCount} products`);
    
  } catch (error) {
    console.error('❌ Error correcting 3-pack SKUs:', error);
    process.exit(1);
  }
}

// Run the script
fix3PackSKUs().then(() => {
  console.log('🏁 3-pack SKU correction completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 3-pack SKU correction failed:', error);
  process.exit(1);
}); 