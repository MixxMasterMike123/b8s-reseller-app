#!/usr/bin/env node

/**
 * Test Order Email System
 * Tests the fixed email orchestrator with a specific order
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getFunctions } = require('firebase-admin/functions');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');

const app = initializeApp({
  credential: require('firebase-admin/app').cert(serviceAccount),
  projectId: 'b8shield-reseller-app'
});

const db = getFirestore(app, 'b8s-reseller-db');

async function testOrderEmails(orderId) {
  try {
    console.log(`🧪 Testing email system with order ID: ${orderId}`);
    
    // Get the order from Firestore
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      console.log(`❌ Order ${orderId} not found`);
      return;
    }
    
    const orderData = orderDoc.data();
    console.log(`📋 Order found: ${orderData.orderNumber || orderId}`);
    console.log(`👤 Customer: ${orderData.customerInfo?.email || 'Unknown'}`);
    console.log(`📊 Status: ${orderData.status || 'Unknown'}`);
    console.log(`💰 Total: ${orderData.total || 0} SEK`);
    
    // Test order status update email (this should work now)
    const { httpsCallable } = require('firebase-functions/v2/https');
    
    console.log('📧 Testing order status update email...');
    
    // We can trigger a status update from 'processing' to 'shipped' as a test
    const testStatusUpdate = {
      orderNumber: orderData.orderNumber || orderId,
      newStatus: 'shipped',
      previousStatus: orderData.status || 'processing',
      userEmail: orderData.customerInfo?.email,
      userId: orderData.userId || null,
      b2cCustomerId: orderData.b2cCustomerId || null
    };
    
    console.log('📧 Test data:', testStatusUpdate);
    console.log('✅ Email system test prepared. You can now test by updating the order status in admin.');
    
  } catch (error) {
    console.error('❌ Error testing order emails:', error);
  }
}

// Run the test
const orderId = process.argv[2] || 'oOcssJqC22VPDtoNlbH6';
testOrderEmails(orderId);
