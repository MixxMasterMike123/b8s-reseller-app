#!/usr/bin/env node

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin using service account
const serviceAccount = require('../service-account.json');
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'b8shield-reseller-app'
});

// Use named database as specified in .firebaserc project config
const db = getFirestore(app, 'b8s-reseller-db');

async function sendOrderEmails(orderId) {
  try {
    console.log(`🔍 Fetching order data for: ${orderId}`);
    
    // Fetch order from named database
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      console.error(`❌ Order ${orderId} not found in b8s-reseller-db`);
      return;
    }
    
    const orderData = orderDoc.data();
    console.log(`✅ Found order: ${orderData.orderNumber}`);
    console.log(`📧 Customer email: ${orderData.customerInfo?.email}`);
    console.log(`🛍️ Items: ${orderData.items?.length || 0}`);
    console.log(`💰 Total: ${orderData.total} SEK`);
    console.log(`🏪 Source: ${orderData.source}`);
    
    // Verify this is a B2C order
    if (orderData.source !== 'b2c') {
      console.log('❌ This is not a B2C order, skipping V3 emails');
      return;
    }
    
    if (!orderData.customerInfo?.email) {
      console.log('❌ No customer email found, cannot send emails');
      return;
    }
    
    // Prepare data for V3 customer email function
    const customerEmailData = {
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
    
    console.log('📧 Sending customer confirmation email via V3...');
    
    // Send customer email using V3 callable function
    const customerResponse = await fetch('https://api.b8shield.com/sendB2COrderPendingEmailV3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: customerEmailData })
    });
    
    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      console.log('✅ Customer email sent successfully:', customerResult.result || customerResult);
    } else {
      const customerError = await customerResponse.text();
      console.error('❌ Customer email failed:', customerResponse.status, customerError);
    }
    
    console.log('📧 Sending admin notification email via V3...');
    
    // Prepare data for V3 admin email function
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
        customerInfo: orderData.customerInfo,
        shippingInfo: orderData.shippingInfo,
        payment: orderData.payment
      }
    };
    
    // Send admin email using V3 callable function  
    const adminResponse = await fetch('https://api.b8shield.com/sendB2COrderNotificationAdminV3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: adminEmailData })
    });
    
    if (adminResponse.ok) {
      const adminResult = await adminResponse.json();
      console.log('✅ Admin email sent successfully:', adminResult.result || adminResult);
    } else {
      const adminError = await adminResponse.text();
      console.error('❌ Admin email failed:', adminResponse.status, adminError);
    }
    
    console.log('🎉 Email sending process completed!');
    
  } catch (error) {
    console.error('❌ Error sending emails:', error);
  }
}

// Run the script with the specific order ID
const orderId = process.argv[2] || 'KwHYud92DVIjOfCpoJQ5';
console.log(`🚀 Starting email send for order: ${orderId}`);
sendOrderEmails(orderId);
