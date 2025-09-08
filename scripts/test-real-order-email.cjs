const https = require('https');

async function testRealOrderEmail() {
  console.log('🧪 Testing admin email with REAL order ID from screenshot...');
  
  // Use the real order ID from the user's screenshot
  const realOrderId = 'qnX1nOCh01N3icq47HVn';
  
  // Create test data that mimics how the real order processing function calls the email
  const testData = {
    data: {
      emailType: 'ORDER_NOTIFICATION_ADMIN',
      customerInfo: {
        firstName: 'micke',
        lastName: '8 sept #5',
        email: 'micke.ohlen@gmail.com',
        phone: '656789876'
      },
      orderId: realOrderId, // Use the real order ID
      source: 'b2c',
      language: 'sv-SE',
      orderData: {
        orderNumber: 'B8S-662999-8G62', // From screenshot
        source: 'b2c',
        status: 'pending',
        customerInfo: {
          firstName: 'micke',
          lastName: '8 sept #5',
          email: 'micke.ohlen@gmail.com',
          phone: '656789876'
        },
        // This is where the real order items structure might be different
        items: [{
          id: 'real-glitter-product',
          name: 'B8Shield Glitter',
          price: 2,
          quantity: 1,
          sku: 'B8S-6-gl',
          // The issue might be that real orders have different color/size structure
          color: 'Glitter',  // This might be an object in real orders
          size: '6'          // This might be an object in real orders
        }],
        totalAmount: 2
      },
      adminEmail: true
    }
  };

  const postData = JSON.stringify(testData);

  const options = {
    hostname: 'us-central1-b8shield-reseller-app.cloudfunctions.net',
    port: 443,
    path: '/sendOrderNotificationAdmin',
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
        console.log('📧 Real order admin email response status:', res.statusCode);
        console.log('📧 Real order admin email response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Real order admin email sent successfully!');
          console.log('🔍 Check Firebase logs for debug output about the REAL order structure');
        } else {
          console.log('❌ Error sending real order admin email');
        }
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error calling real order admin email function:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
testRealOrderEmail().catch(console.error);
