const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Use the named database
const namedDb = admin.firestore(admin.app(), 'b8s-reseller-db');

async function testProductFields() {
  const productId = 'GvAc6NCtubvgE0edJBGS';
  
  console.log(`🔍 Testing product fields for: ${productId}`);
  
  try {
    const productRef = namedDb.collection('products').doc(productId);
    const productSnap = await productRef.get();
    
    if (!productSnap.exists) {
      console.log('❌ Product not found');
      return;
    }
    
    const productData = productSnap.data();
    console.log('✅ Product found!');
    console.log('🔍 Product color:', productData.color, '(type:', typeof productData.color, ')');
    console.log('🔍 Product size:', productData.size, '(type:', typeof productData.size, ')');
    console.log('🔍 Product name:', productData.name);
    console.log('🔍 Product sku:', productData.sku);
    
    // Test cart logic
    console.log('\n🧪 Testing cart logic:');
    const cartItem = {
      id: productData.id || productId,
      name: productData.name,
      price: productData.b2cPrice || productData.basePrice,
      sku: productData.sku,
      color: productData.color || null,
      size: productData.size || null,
      quantity: 1
    };
    
    console.log('🔍 Cart item would be:', JSON.stringify(cartItem, null, 2));
    
    if (cartItem.color && cartItem.size) {
      console.log('✅ SUCCESS: Cart item has both color and size fields!');
    } else {
      console.log('❌ PROBLEM: Cart item is missing color and/or size fields');
      console.log('   - Color:', cartItem.color ? 'Present' : 'Missing');
      console.log('   - Size:', cartItem.size ? 'Present' : 'Missing');
    }
    
  } catch (error) {
    console.error('❌ Error testing product fields:', error);
  }
}

testProductFields();
