// Script to investigate zero-amount orders and their causes
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLNLhpnPLw8TbKPXGCbHJ6r4y8zTMBLmw",
  authDomain: "b8shield-reseller-app.firebaseapp.com",
  databaseURL: "https://b8shield-reseller-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "b8shield-reseller-app",
  storageBucket: "b8shield-reseller-app.firebasestorage.app",
  messagingSenderId: "1048859685969",
  appId: "1:1048859685969:web:c5c6f4e7e8f9a0b1c2d3e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'b8s-reseller-db');

async function investigateZeroOrders() {
  try {
    console.log('🔍 Investigating zero-amount orders...\n');

    // Get recent orders (simplified query to avoid index requirement)
    const ordersRef = collection(db, 'orders');
    const recentOrdersQuery = query(
      ordersRef,
      where('source', '==', 'b2c')
    );
    
    const ordersSnap = await getDocs(recentOrdersQuery);
    
    console.log(`📊 Found ${ordersSnap.size} B2C orders\n`);
    
    let zeroOrders = [];
    let normalOrders = [];
    
    ordersSnap.docs.forEach(doc => {
      const order = { id: doc.id, ...doc.data() };
      
      if (order.total === 0 || order.subtotal === 0) {
        zeroOrders.push(order);
      } else {
        normalOrders.push(order);
      }
    });
    
    console.log(`❌ Zero-amount orders: ${zeroOrders.length}`);
    console.log(`✅ Normal orders: ${normalOrders.length}\n`);
    
    // Analyze zero orders
    if (zeroOrders.length > 0) {
      console.log('🔍 ZERO-AMOUNT ORDERS ANALYSIS:\n');
      
      zeroOrders.forEach((order, index) => {
        console.log(`--- Zero Order #${index + 1} ---`);
        console.log(`Order Number: ${order.orderNumber}`);
        console.log(`Order ID: ${order.id}`);
        console.log(`Status: ${order.status}`);
        console.log(`Created: ${order.createdAt?.toDate?.()?.toLocaleString('sv-SE') || order.createdAt}`);
        console.log(`Customer: ${order.customerInfo?.email || 'Unknown'}`);
        console.log(`Source: ${order.source}`);
        
        console.log(`\n💰 Pricing Breakdown:`);
        console.log(`   Subtotal: ${order.subtotal || 0} kr`);
        console.log(`   Shipping: ${order.shipping || 0} kr`);
        console.log(`   VAT: ${order.vat || 0} kr`);
        console.log(`   Discount: ${order.discountAmount || 0} kr`);
        console.log(`   Total: ${order.total || 0} kr`);
        
        console.log(`\n📦 Items (${order.items?.length || 0}):`);
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.name?.['sv-SE'] || item.name || 'Unknown'}`);
            console.log(`      Price: ${item.price || 0} kr × ${item.quantity || 1} = ${(item.price || 0) * (item.quantity || 1)} kr`);
            console.log(`      SKU: ${item.sku || 'N/A'}`);
          });
        } else {
          console.log('   ⚠️ NO ITEMS IN ORDER!');
        }
        
        console.log(`\n💳 Payment Info:`);
        console.log(`   Method: ${order.payment?.method || 'Unknown'}`);
        console.log(`   Payment Intent ID: ${order.payment?.paymentIntentId || 'None'}`);
        console.log(`   Payment Status: ${order.payment?.status || 'Unknown'}`);
        console.log(`   Payment Amount: ${order.payment?.amount || 0} kr`);
        
        console.log(`\n👤 Affiliate Info:`);
        console.log(`   Code: ${order.affiliate?.code || 'None'}`);
        console.log(`   Discount %: ${order.affiliate?.discountPercentage || 0}%`);
        console.log(`   Click ID: ${order.affiliate?.clickId || 'None'}`);
        
        console.log('\n' + '='.repeat(50) + '\n');
      });
    }
    
    // Show recent normal orders for comparison
    if (normalOrders.length > 0) {
      console.log('✅ RECENT NORMAL ORDERS (for comparison):\n');
      
      normalOrders.slice(0, 3).forEach((order, index) => {
        console.log(`--- Normal Order #${index + 1} ---`);
        console.log(`Order Number: ${order.orderNumber}`);
        console.log(`Customer: ${order.customerInfo?.email || 'Unknown'}`);
        console.log(`Total: ${order.total || 0} kr`);
        console.log(`Payment Method: ${order.payment?.method || 'Unknown'}`);
        console.log(`Payment Status: ${order.payment?.status || 'Unknown'}`);
        console.log(`Items: ${order.items?.length || 0}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error investigating zero orders:', error);
    throw error;
  }
}

// Run the script
investigateZeroOrders()
  .then(() => {
    console.log('🔍 Zero order investigation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Investigation failed:', error);
    process.exit(1);
  });
