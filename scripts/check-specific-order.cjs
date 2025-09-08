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

async function checkSpecificOrder() {
  const orderId = 'GuBFVNWGmYCjMnE0rmYH'; // From the console logs
  
  console.log(`🔍 Checking order: ${orderId}`);
  
  try {
    const orderRef = namedDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) {
      console.log('❌ Order not found');
      return;
    }
    
    const orderData = orderSnap.data();
    console.log('✅ Order found!');
    console.log('🔍 Order source:', orderData.source);
    console.log('🔍 Order status:', orderData.status);
    console.log('🔍 Order items:');
    
    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach((item, index) => {
        console.log(`\n--- Item ${index + 1} ---`);
        console.log('ID:', item.id);
        console.log('Name:', item.name);
        console.log('SKU:', item.sku);
        console.log('Price:', item.price);
        console.log('Quantity:', item.quantity);
        console.log('Color:', item.color, '(type:', typeof item.color, ')');
        console.log('Size:', item.size, '(type:', typeof item.size, ')');
        
        if (item.color && item.size) {
          console.log('✅ SUCCESS: This item HAS color and size fields!');
        } else {
          console.log('❌ MISSING: This item is missing color and/or size fields');
        }
      });
    } else {
      console.log('❌ No items found in order');
    }
    
  } catch (error) {
    console.error('❌ Error checking order:', error);
  }
}

checkSpecificOrder();
