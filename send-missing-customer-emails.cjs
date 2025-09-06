// Send customer confirmation emails for missing orders
const https = require('https');

const orderIds = [
  'SDQeu1w9M2BDAVHJgKUe',
  'KwHYud92DVIjOfCpoJQ5', 
  'UA73g0wOZzzMupHDJiqX',
  'oCXP39xtk1C0Fl7E9b2f'
];

const sendCustomerEmailForOrder = async (orderId) => {
  console.log(`📧 Sending customer email for order: ${orderId}`);
  
  const orderData = {
    orderNumber: `CUSTOMER-${orderId}`,
    status: 'pending',
    source: 'b2c',
    items: [
      {
        name: 'B8Shield Product (Customer Email Test)',
        quantity: 1,
        price: 79,
        sku: 'B8S-CUSTOMER-TEST',
        color: 'Transparent',
        size: '4-pack'
      }
    ],
    customerInfo: {
      email: 'micke.ohlen@gmail.com', // Send to your email for testing
      name: 'Test Customer Email'
    },
    subtotal: 79,
    shipping: 29,
    vat: 27,
    total: 135,
    createdAt: new Date().toISOString()
  };

  const postData = JSON.stringify({
    data: { 
      orderData,
      customerInfo: {
        email: 'micke.ohlen@gmail.com',
        name: 'Test Customer Email'
      },
      orderId: orderId
    }
  });

  const options = {
    hostname: 'us-central1-b8shield-reseller-app.cloudfunctions.net',
    port: 443,
    path: '/sendB2COrderPendingEmailV3',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${orderId}: Customer email sent successfully`);
        } else {
          console.log(`❌ ${orderId}: Failed (${res.statusCode}) - ${data}`);
        }
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${orderId}: Error -`, error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

// Send customer emails for all missing orders
const sendAllCustomerEmails = async () => {
  console.log('🚀 Sending customer confirmation emails for missing orders...\n');
  
  for (const orderId of orderIds) {
    try {
      await sendCustomerEmailForOrder(orderId);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    } catch (error) {
      console.error(`Failed to send customer email for ${orderId}:`, error.message);
    }
  }
  
  console.log('\n✅ All customer emails sent! Check your inbox for customer confirmation emails.');
};

sendAllCustomerEmails();
