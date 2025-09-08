const https = require('https');

async function testEmailWithCartStructure() {
  console.log('🧪 Testing admin email with EXACT cart data structure...');
  
  // Use the EXACT structure we just confirmed works in the cart
  const testData = {
    data: {
      emailType: 'ORDER_NOTIFICATION_ADMIN',
      customerInfo: {
        firstName: 'Test',
        lastName: 'Cart Structure',
        email: 'micke.ohlen@gmail.com',
        phone: '123456789'
      },
      orderId: `cart-test-${Date.now()}`,
      source: 'b2c',
      language: 'sv-SE',
      orderData: {
        orderNumber: `CART-TEST-${Date.now()}`,
        source: 'b2c',
        status: 'pending',
        customerInfo: {
          firstName: 'Test',
          lastName: 'Cart Structure',
          email: 'micke.ohlen@gmail.com',
          phone: '123456789'
        },
        // Use EXACT cart structure from console log
        items: [{
          id: 'GvAc6NCtubvgE0edJBGS',
          name: { 'sv-SE': 'B8Shield Glitter' }, // Multilingual object like in cart
          price: 2,
          quantity: 1,
          sku: 'B8S-6-gl',
          color: 'Glitter',  // Simple string like in cart
          size: '6',         // Simple string like in cart
          image: 'test-image.jpg'
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
        console.log('📧 Cart structure email response status:', res.statusCode);
        console.log('📧 Cart structure email response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Cart structure email sent successfully!');
          console.log('🔍 Check your email to see if size shows correctly with cart data structure');
        } else {
          console.log('❌ Error sending cart structure email');
        }
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error calling cart structure email function:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
testEmailWithCartStructure().catch(console.error);
