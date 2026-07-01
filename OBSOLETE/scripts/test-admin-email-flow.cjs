const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json')
});

const db = admin.firestore().database('b8s-reseller-db');

async function testAdminEmailFlow() {
  try {
    console.log('🧪 Creating test order with B8Shield Glitter product...');
    
    // Create a test order with the exact structure that would come from checkout
    const testOrderData = {
      orderNumber: `TEST-${Date.now()}-DEBUG`,
      source: 'b2c',
      status: 'pending',
      items: [{
        id: 'test-glitter-product',
        name: 'B8Shield Glitter',
        price: 2,
        quantity: 1,
        sku: 'B8S-6-gl',
        color: 'Glitter',
        size: '6',  // This should appear in the admin email
        image: 'test-image.jpg'
      }],
      totalAmount: 2,
      customerInfo: {
        firstName: 'Test',
        lastName: 'Customer', 
        email: 'micke.ohlen@gmail.com',
        phone: '123456789'
      },
      shippingAddress: {
        name: 'Test Customer',
        address: 'Test Address 123',
        city: 'Stockholm',
        postalCode: '12345',
        country: 'SE'
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Add the order to Firestore
    console.log('📝 Adding order to Firestore...');
    const orderRef = await db.collection('orders').add(testOrderData);
    console.log('✅ Test order created with ID:', orderRef.id);

    // Now call the order processing function that sends the admin email
    console.log('📧 Calling order processing function to send admin email...');
    
    // Use the Firebase Admin SDK to call the cloud function
    const https = require('https');
    const postData = JSON.stringify({
      data: {
        orderData: {
          ...testOrderData,
          id: orderRef.id
        },
        customerInfo: testOrderData.customerInfo,
        orderId: orderRef.id
      }
    });

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

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('📧 Admin email function response:', data);
        console.log('🔍 Check Firebase logs for debug output about size field');
        
        // Clean up - delete the test order
        orderRef.delete().then(() => {
          console.log('🗑️ Test order cleaned up');
        });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error calling admin email function:', error);
      // Clean up even on error
      orderRef.delete();
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.error('❌ Error in test flow:', error);
  }
}

// Run the test
testAdminEmailFlow();
