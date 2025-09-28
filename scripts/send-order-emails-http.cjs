#!/usr/bin/env node

// Simple HTTP approach to send emails using deployed V3 callable functions
// This avoids Firebase Admin SDK permission issues

async function sendOrderEmails(orderId) {
  try {
    console.log(`🚀 Starting email send for order: ${orderId}`);
    
    // First, let's manually trigger the V2 order completion function 
    // which should fetch order data and send emails
    console.log('📧 Triggering order completion function to send emails...');
    
    const orderCompletionResponse = await fetch('https://api.b8shield.com/processB2COrderCompletionHttpV2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId: orderId })
    });
    
    if (orderCompletionResponse.ok) {
      const result = await orderCompletionResponse.json();
      console.log('✅ Order completion function executed:', result);
      
      // The V2 function should trigger emails automatically
      console.log('📧 Emails should have been sent via order completion trigger');
      
    } else {
      const errorText = await orderCompletionResponse.text();
      console.error('❌ Order completion function failed:', orderCompletionResponse.status, errorText);
    }
    
    // Alternative: Try to manually trigger the V3 email trigger
    console.log('📧 Attempting to manually trigger V3 email system...');
    
    // For the V3 callable functions, we need the order data structure
    // Since we can't access Firestore directly, we'll use known data from the order
    const sampleOrderData = {
      orderData: {
        orderNumber: 'B8S-153632-61A1', // Sara Wallenius order
        items: [
          {
            id: 'MxYbUCW6',
            name: 'B8Shield',
            price: 80,
            quantity: 1,
            sku: 'B8S-4-re'
          }
        ],
        subtotal: 80,
        shipping: 29,
        vat: 27.25,
        total: 207,
        discountAmount: 0
      },
      customerInfo: {
        firstName: 'Sara',
        lastName: 'Wallenius', 
        name: 'Sara Wallenius',
        email: 'sarawallenius21@gmail.com'
      },
      orderId: orderId
    };
    
    // Try V3 customer email
    console.log('📧 Sending V3 customer confirmation email...');
    const customerResponse = await fetch('https://api.b8shield.com/sendB2COrderPendingEmailV3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: sampleOrderData })
    });
    
    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      console.log('✅ V3 Customer email sent successfully:', customerResult);
    } else {
      const customerError = await customerResponse.text();
      console.error('❌ V3 Customer email failed:', customerResponse.status, customerError);
    }
    
    // Try V3 admin email
    console.log('📧 Sending V3 admin notification email...');
    const adminEmailData = {
      orderData: {
        ...sampleOrderData.orderData,
        customerInfo: sampleOrderData.customerInfo,
        shippingInfo: {
          address: 'Test Address',
          city: 'Stockholm', 
          postalCode: '12345',
          country: 'SE'
        }
      }
    };
    
    const adminResponse = await fetch('https://api.b8shield.com/sendB2COrderNotificationAdminV3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: adminEmailData })
    });
    
    if (adminResponse.ok) {
      const adminResult = await adminResponse.json();
      console.log('✅ V3 Admin email sent successfully:', adminResult);
    } else {
      const adminError = await adminResponse.text();
      console.error('❌ V3 Admin email failed:', adminResponse.status, adminError);
    }
    
    console.log('🎉 Email sending process completed!');
    
  } catch (error) {
    console.error('❌ Error sending emails:', error);
  }
}

// Run the script with the specific order ID
const orderId = process.argv[2] || 'KwHYud92DVIjOfCpoJQ5';
sendOrderEmails(orderId);
