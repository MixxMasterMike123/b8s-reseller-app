const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json')
});

const db = admin.firestore().database('b8s-reseller-db');

async function debugRecentOrder() {
  try {
    console.log('🔍 Looking for recent B2C orders...');
    
    // Get the most recent B2C order
    const ordersSnapshot = await db.collection('orders')
      .where('source', '==', 'b2c')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (ordersSnapshot.empty) {
      console.log('❌ No B2C orders found');
      return;
    }
    
    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();
    
    console.log('=== ORDER DEBUG INFO ===');
    console.log('Order ID:', orderDoc.id);
    console.log('Order Number:', orderData.orderNumber);
    console.log('Source:', orderData.source);
    
    console.log('\n=== ORDER ITEMS ===');
    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, JSON.stringify(item, null, 2));
        console.log(`- Name: ${item.name}`);
        console.log(`- Color: ${item.color}`);
        console.log(`- Size: ${item.size}`);
        console.log(`- SKU: ${item.sku}`);
        console.log('---');
      });
    } else {
      console.log('❌ No items array found');
    }
    
    console.log('\n=== CUSTOMER INFO ===');
    console.log('Email:', orderData.customerInfo?.email);
    
    console.log('\n=== FULL ORDER DATA ===');
    console.log(JSON.stringify(orderData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugRecentOrder().then(() => {
  console.log('✅ Debug complete');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
