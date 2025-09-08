const https = require('https');

async function testCustomerEmailWithDebug() {
  console.log('🧪 Testing customer order confirmation email with debug logging...');
  
  // Create test data with the exact structure used by order processing function
  const testData = {
    data: {
      emailType: 'ORDER_CONFIRMATION',
      customerInfo: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'micke.ohlen@gmail.com',
        phone: '123456789'
      },
      orderId: `test-customer-order-${Date.now()}`,
      source: 'b2c',
      language: 'sv-SE',
      orderData: {
        orderNumber: `TEST-CUSTOMER-${Date.now()}-DEBUG`,
        source: 'b2c',
        status: 'pending',
        customerInfo: {
          firstName: 'Test',
          lastName: 'Customer',
          email: 'micke.ohlen@gmail.com',
          phone: '123456789'
        },
        items: [{
          id: 'test-glitter-product',
          name: 'B8Shield Glitter',
          price: 2,
          quantity: 1,
          sku: 'B8S-6-gl',
          color: 'Glitter',
          size: '6',  // ← This should appear in the customer email too
          image: 'test-image.jpg'
        }],
        subtotal: 2,
        shipping: 19,
        vat: 4,
        total: 25,
        totalAmount: 25
      },
      orderType: 'B2C'
    }
  };

  const postData = JSON.stringify(testData);

  const options = {
    hostname: 'us-central1-b8shield-reseller-app.cloudfunctions.net',
    port: 443,
    path: '/sendOrderConfirmationEmail',
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
        console.log('📧 Customer email function response status:', res.statusCode);
        console.log('📧 Customer email function response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Customer email sent successfully!');
          console.log('🔍 Check your email and Firebase logs for debug output about the size field');
        } else {
          console.log('❌ Error sending customer email');
        }
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error calling customer email function:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
testCustomerEmailWithDebug().catch(console.error);
