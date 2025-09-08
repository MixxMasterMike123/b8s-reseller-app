#!/usr/bin/env node

/**
 * Debug Order Structure
 * Check the actual structure of a recent order to see if size/color data is missing
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');

const app = initializeApp({
  credential: require('firebase-admin/app').cert(serviceAccount),
  projectId: 'b8shield-reseller-app'
});

const db = getFirestore(app, 'b8s-reseller-db');

async function debugOrderStructure() {
  try {
    console.log('🔍 Looking for recent orders...');
    
    // Get the most recent order
    const ordersRef = db.collection('orders');
    const recentOrders = await ordersRef.orderBy('createdAt', 'desc').limit(3).get();
    
    if (recentOrders.empty) {
      console.log('❌ No orders found');
      return;
    }
    
    recentOrders.docs.forEach((doc, index) => {
      const orderData = doc.data();
      console.log(`\n📋 ORDER ${index + 1}: ${doc.id}`);
      console.log(`📧 Order Number: ${orderData.orderNumber || 'N/A'}`);
      console.log(`👤 Customer: ${orderData.customerInfo?.email || orderData.customerEmail || 'N/A'}`);
      console.log(`📅 Created: ${orderData.createdAt?.toDate?.() || orderData.createdAt || 'N/A'}`);
      
      console.log('\n🛒 ITEMS STRUCTURE:');
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach((item, itemIndex) => {
          console.log(`  Item ${itemIndex + 1}:`);
          console.log(`    Name: ${typeof item.name === 'object' ? JSON.stringify(item.name) : item.name || 'N/A'}`);
          console.log(`    Color: ${item.color || 'MISSING ❌'}`);
          console.log(`    Size: ${item.size || 'MISSING ❌'}`);
          console.log(`    SKU: ${item.sku || 'N/A'}`);
          console.log(`    Quantity: ${item.quantity || 'N/A'}`);
          console.log(`    Price: ${item.price || 'N/A'}`);
          console.log(`    Full item structure:`, JSON.stringify(item, null, 2));
        });
      } else {
        console.log('  ❌ No items array found or items is not an array');
        console.log(`  Raw items data:`, JSON.stringify(orderData.items, null, 2));
      }
      
      console.log('\n🎯 OTHER POTENTIAL PRODUCT DATA:');
      if (orderData.cartItems) {
        console.log(`  cartItems found:`, JSON.stringify(orderData.cartItems, null, 2));
      }
      if (orderData.products) {
        console.log(`  products found:`, JSON.stringify(orderData.products, null, 2));
      }
      if (orderData.orderItems) {
        console.log(`  orderItems found:`, JSON.stringify(orderData.orderItems, null, 2));
      }
      
      console.log('\n' + '='.repeat(60));
    });
    
  } catch (error) {
    console.error('❌ Error debugging order structure:', error);
  }
}

// Run the debug
debugOrderStructure();
