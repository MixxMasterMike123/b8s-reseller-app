#!/usr/bin/env node

/**
 * B8Shield Missing Orders Investigation Script
 * Checks for missing orders between Stripe and Firebase
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../service-account.json')),
    databaseURL: 'https://b8shield-reseller-app-default-rtdb.firebaseio.com/',
    storageBucket: 'b8shield-reseller-app.appspot.com'
  });
}

const db = admin.firestore();
// CRITICAL: Use named database
const namedDb = admin.firestore(admin.app(), 'b8s-reseller-db');

async function investigateMissingOrders() {
  console.log('🔍 B8Shield Missing Orders Investigation');
  console.log('=====================================');
  
  try {
    // 1. Check recent B2C orders in Firebase
    console.log('\n📊 Recent B2C Orders in Firebase (last 7 days):');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const ordersRef = namedDb.collection('orders');
    const recentOrders = await ordersRef
      .where('source', '==', 'b2c')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(weekAgo))
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log(`Found ${recentOrders.size} B2C orders in last 7 days:`);
    
    recentOrders.forEach(doc => {
      const order = doc.data();
      const date = order.createdAt ? order.createdAt.toDate().toLocaleString('sv-SE') : 'No date';
      console.log(`  - ${doc.id}: ${order.orderNumber || 'No order number'} | ${date} | ${order.total || 0} SEK | ${order.customerInfo?.email || 'No email'}`);
    });
    
    // 2. Check for orders on specific dates (13th-16th Sept)
    console.log('\n📅 Orders from 13th-16th September 2025:');
    
    const sept13 = new Date('2025-09-13T00:00:00Z');
    const sept17 = new Date('2025-09-17T00:00:00Z');
    
    const targetOrders = await ordersRef
      .where('source', '==', 'b2c')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sept13))
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(sept17))
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log(`Found ${targetOrders.size} B2C orders from 13th-16th Sept:`);
    
    targetOrders.forEach(doc => {
      const order = doc.data();
      const date = order.createdAt ? order.createdAt.toDate().toLocaleString('sv-SE') : 'No date';
      console.log(`  - ${doc.id}: ${order.orderNumber || 'No order number'} | ${date} | ${order.total || 0} SEK | ${order.customerInfo?.email || 'No email'} | Payment: ${order.payment?.method || 'Unknown'}`);
    });
    
    // 3. Check for any orders with specific email addresses from your screenshot
    console.log('\n📧 Checking specific customer emails from Stripe:');
    const emailsToCheck = [
      'ida.larsson91@hotmail.com',
      'mullebulle79@hotmail.com', 
      'hjelpe@live.se',
      'freja.soleskog@gmail.com',
      'gklavmarten@gmail.com'
    ];
    
    for (const email of emailsToCheck) {
      const emailOrders = await ordersRef
        .where('source', '==', 'b2c')
        .where('customerInfo.email', '==', email)
        .get();
      
      console.log(`  - ${email}: ${emailOrders.size} orders found`);
      emailOrders.forEach(doc => {
        const order = doc.data();
        const date = order.createdAt ? order.createdAt.toDate().toLocaleString('sv-SE') : 'No date';
        console.log(`    └─ ${doc.id}: ${order.orderNumber} | ${date} | ${order.total} SEK`);
      });
    }
    
    // 4. Check for orders with Klarna payment method
    console.log('\n💳 Orders with Klarna payment method:');
    const klarnaOrders = await ordersRef
      .where('source', '==', 'b2c')
      .where('payment.method', '==', 'klarna')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`Found ${klarnaOrders.size} Klarna orders:`);
    klarnaOrders.forEach(doc => {
      const order = doc.data();
      const date = order.createdAt ? order.createdAt.toDate().toLocaleString('sv-SE') : 'No date';
      console.log(`  - ${doc.id}: ${order.orderNumber} | ${date} | ${order.total} SEK | ${order.customerInfo?.email}`);
    });
    
    // 5. Test the order processing function with a recent order
    console.log('\n🔧 Testing Order Processing Function:');
    if (recentOrders.size > 0) {
      const testOrder = recentOrders.docs[0];
      const testOrderId = testOrder.id;
      console.log(`Testing with order: ${testOrderId}`);
      
      try {
        const functionUrl = 'https://api.b8shield.com/processB2COrderCompletionHttpV2';
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId: testOrderId }),
        });
        
        const result = await response.json();
        console.log(`Function test result:`, result);
      } catch (error) {
        console.error(`Function test failed:`, error.message);
      }
    }
    
    console.log('\n✅ Investigation complete!');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateMissingOrders().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
