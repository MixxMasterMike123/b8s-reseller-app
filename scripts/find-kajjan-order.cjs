/**
 * Find the Firestore document ID for order B8S-249100-6RPW
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({ databaseId: 'b8s-reseller-db' });

async function findKajjanOrder() {
  try {
    console.log('🔍 Looking for order B8S-249100-6RPW...');
    
    // Search for the order by order number
    const ordersRef = db.collection('orders');
    const orderQuery = ordersRef.where('orderNumber', '==', 'B8S-249100-6RPW');
    const orderSnapshot = await orderQuery.get();

    if (orderSnapshot.empty) {
      console.log('❌ Order B8S-249100-6RPW not found!');
      console.log('');
      console.log('💡 Alternative: Look for KAJJAN10 orders around Sept 4th...');
      
      // Look for KAJJAN10 orders
      const kajjanQuery = ordersRef.where('affiliate.code', '==', 'KAJJAN10').orderBy('createdAt', 'desc').limit(10);
      const kajjanSnapshot = await kajjanQuery.get();
      
      console.log('📋 Recent KAJJAN10 orders:');
      kajjanSnapshot.forEach(doc => {
        const order = doc.data();
        const date = order.createdAt?.toDate?.() || 'Unknown date';
        console.log(`- ${doc.id}: ${order.orderNumber} (${order.total} SEK) - ${date}`);
      });
      
      return;
    }

    const orderDoc = orderSnapshot.docs[0];
    const orderData = orderDoc.data();
    const orderId = orderDoc.id;

    console.log('✅ Found order!');
    console.log(`Firestore ID: ${orderId}`);
    console.log(`Order Number: ${orderData.orderNumber}`);
    console.log(`Total: ${orderData.total} SEK`);
    console.log(`Affiliate: ${orderData.affiliate?.code || 'None'}`);
    console.log(`Status: ${orderData.status}`);
    console.log(`Created: ${orderData.createdAt?.toDate?.() || 'Unknown'}`);
    console.log('');
    
    // Now we can manually trigger the commission processing
    console.log('💡 To manually process commission, run:');
    console.log(`curl -X POST https://us-central1-b8shield-reseller-app.cloudfunctions.net/processB2COrderCompletionHttpV2 \\`);
    console.log(`  -H 'Content-Type: application/json' \\`);
    console.log(`  -d '{"orderId": "${orderId}"}' \\`);
    console.log(`  --verbose`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

findKajjanOrder();
