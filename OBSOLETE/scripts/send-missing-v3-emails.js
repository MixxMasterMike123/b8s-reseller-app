#!/usr/bin/env node

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
initializeApp({
  credential: require('firebase-admin/auth').applicationDefault(),
  projectId: 'b8shield-reseller-app'
});

const db = getFirestore('b8s-reseller-db');

async function sendMissingEmails(orderId) {
  try {
    console.log(`🔍 Fetching order data for: ${orderId}`);
    
    // Fetch order from Firestore
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      console.error(`❌ Order ${orderId} not found`);
      return;
    }
    
    const orderData = orderDoc.data();
    console.log(`✅ Found order: ${orderData.orderNumber}`);
    console.log(`📧 Customer email: ${orderData.customerInfo?.email}`);
    console.log(`🛍️ Items: ${orderData.items?.length || 0}`);
    console.log(`💰 Total: ${orderData.total} SEK`);
    
    // Verify this is a B2C order
    if (orderData.source !== 'b2c') {
      console.log('❌ This is not a B2C order, skipping');
      return;
    }
    
    // Prepare data for V3 functions
    const emailData = {
      orderData: {
        orderNumber: orderData.orderNumber,
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        shipping: orderData.shipping || 0,
        vat: orderData.vat || 0,
        total: orderData.total || 0,
        discountAmount: orderData.discountAmount || 0,
        affiliateCode: orderData.affiliateCode || orderData.affiliate?.code
      },
      customerInfo: {
        firstName: orderData.customerInfo?.firstName,
        lastName: orderData.customerInfo?.lastName,
        name: orderData.customerInfo?.name,
        email: orderData.customerInfo?.email
      },
      orderId: orderId
    };
    
    console.log('📧 Sending customer confirmation email...');
    
    // Send customer email using Firebase Functions HTTP endpoint
    const customerResponse = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/sendB2COrderPendingEmailV3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: emailData })
    });
    
    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      console.log('✅ Customer email sent successfully:', customerResult);
    } else {
      const customerError = await customerResponse.text();
      console.error('❌ Customer email failed:', customerError);
    }
    
    console.log('📧 Sending admin notification email...');
    
    // Send admin email
    const adminEmailData = {
      orderData: {
        orderNumber: orderData.orderNumber,
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        shipping: orderData.shipping || 0,
        vat: orderData.vat || 0,
        total: orderData.total || 0,
        discountAmount: orderData.discountAmount || 0,
        affiliateCode: orderData.affiliateCode || orderData.affiliate?.code,
        customerInfo: orderData.customerInfo
      }
    };
    
    const adminResponse = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/sendB2COrderNotificationAdminV3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: adminEmailData })
    });
    
    if (adminResponse.ok) {
      const adminResult = await adminResponse.json();
      console.log('✅ Admin email sent successfully:', adminResult);
    } else {
      const adminError = await adminResponse.text();
      console.error('❌ Admin email failed:', adminError);
    }
    
  } catch (error) {
    console.error('❌ Error sending emails:', error);
  }
}

// Run the script
const orderId = process.argv[2] || 'KwHYud92DVIjOfCpoJQ5';
sendMissingEmails(orderId);
