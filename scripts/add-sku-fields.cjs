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

// Master SKU mapping based on product names and characteristics
const SKU_MAPPING = {
  // Individual Color & Size combinations
  'B8Shield Red': {
    '2': 'B8S-2-re',
    '4': 'B8S-4-re', 
    '6': 'B8S-6-re'
  },
  'B8Shield Transparent': {
    '2': 'B8S-2-tr',
    '4': 'B8S-4-tr',
    '6': 'B8S-6-tr'
  },
  'B8Shield Fluorescent': {
    '2': 'B8S-2-fl',
    '4': 'B8S-4-fl',
    '6': 'B8S-6-fl'
  },
  'B8Shield Glitter': {
    '2': 'B8S-2-gl',
    '4': 'B8S-4-gl',
    '6': 'B8S-6-gl'
  },
  
  // Multi-pack products
  'B8Shield Multi Pack': 'B8S-1-MP-9',
  'B8Shield 3 pack Red': 'B8S-3p-re',
  'B8Shield 3 pack Transparent': 'B8S-3p-tr',
  'B8Shield 3 pack Fluorescent': 'B8S-3p-fl',
  'B8Shield 3 pack Glitter': 'B8S-3p-gl',
  
  // Alternative naming patterns
  'B8Shield Röd': {
    '2': 'B8S-2-re',
    '4': 'B8S-4-re',
    '6': 'B8S-6-re'
  },
  'B8Shield Fluorescerande': {
    '2': 'B8S-2-fl',
    '4': 'B8S-4-fl',
    '6': 'B8S-6-fl'
  }
};

// Function to determine SKU based on product name and size
function determineSKU(productName, size) {
  console.log(`🔍 Determining SKU for: "${productName}" size: "${size}"`);
  
  // Direct match for multi-pack products (no size dependency)
  if (SKU_MAPPING[productName] && typeof SKU_MAPPING[productName] === 'string') {
    console.log(`✅ Direct match found: ${SKU_MAPPING[productName]}`);
    return SKU_MAPPING[productName];
  }
  
  // Size-based match for individual products
  if (SKU_MAPPING[productName] && typeof SKU_MAPPING[productName] === 'object') {
    const sizeKey = size?.toString() || '4'; // Default to size 4 if no size specified
    const sku = SKU_MAPPING[productName][sizeKey];
    if (sku) {
      console.log(`✅ Size-based match found: ${sku}`);
      return sku;
    }
  }
  
  // Fallback pattern matching
  const lowerName = productName.toLowerCase();
  const sizeKey = size?.toString() || '4';
  
  if (lowerName.includes('red') || lowerName.includes('röd')) {
    const sku = `B8S-${sizeKey}-re`;
    console.log(`🔄 Fallback Red pattern: ${sku}`);
    return sku;
  }
  
  if (lowerName.includes('transparent')) {
    const sku = `B8S-${sizeKey}-tr`;
    console.log(`🔄 Fallback Transparent pattern: ${sku}`);
    return sku;
  }
  
  if (lowerName.includes('fluorescent') || lowerName.includes('fluorescerande')) {
    const sku = `B8S-${sizeKey}-fl`;
    console.log(`🔄 Fallback Fluorescent pattern: ${sku}`);
    return sku;
  }
  
  if (lowerName.includes('glitter')) {
    const sku = `B8S-${sizeKey}-gl`;
    console.log(`🔄 Fallback Glitter pattern: ${sku}`);
    return sku;
  }
  
  // Default SKU if no pattern matches
  const defaultSku = `B8S-${sizeKey}-XX`;
  console.log(`⚠️ No pattern match, using default: ${defaultSku}`);
  return defaultSku;
}

async function addSKUFields() {
  try {
    console.log('🚀 Starting SKU field addition process...');
    console.log('📊 Connecting to Firestore database: b8s-reseller-db');
    
    // Get all products
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    
    console.log(`📦 Found ${querySnapshot.size} products to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each product
    for (const docSnap of querySnapshot.docs) {
      const productData = docSnap.data();
      const productId = docSnap.id;
      
      console.log(`\n🔄 Processing product: ${productId}`);
      console.log(`   Name: ${productData.name}`);
      console.log(`   Size: ${productData.size || 'Not specified'}`);
      console.log(`   Current SKU: ${productData.sku || 'Not set'}`);
      
      // Skip if SKU already exists
      if (productData.sku) {
        console.log(`   ⏭️ SKU already exists, skipping`);
        skippedCount++;
        continue;
      }
      
      // Determine SKU based on product name and size
      const newSKU = determineSKU(productData.name, productData.size);
      
      // Update the product with the new SKU
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        sku: newSKU,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`   ✅ Updated with SKU: ${newSKU}`);
      updatedCount++;
    }
    
    console.log(`\n🎉 SKU field addition completed!`);
    console.log(`   ✅ Updated: ${updatedCount} products`);
    console.log(`   ⏭️ Skipped: ${skippedCount} products (already had SKU)`);
    console.log(`   📊 Total processed: ${querySnapshot.size} products`);
    
  } catch (error) {
    console.error('❌ Error adding SKU fields:', error);
    process.exit(1);
  }
}

// Run the script
addSKUFields().then(() => {
  console.log('🏁 Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 