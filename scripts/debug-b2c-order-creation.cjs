const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Use the named database
const namedDb = admin.firestore(admin.app(), 'b8s-reseller-db');

async function debugB2COrderCreation() {
  console.log('🔍 Creating test B2C order to debug color/size fields...');
  
  try {
    // Mock cart items with explicit color and size (same as frontend)
    const cartItems = [{
      id: "GvAc6NCtubvgE0edJBGS",
      name: { "sv-SE": "B8Shield Glitter" },
      price: 2,
      quantity: 1,
      sku: "B8S-6-gl",
      color: "Glitter",  // ← Explicit string value
      size: "6",         // ← Explicit string value
      image: "https://firebasestorage.googleapis.com/v0/b/b8shield-reseller-app.firebasestorage.app/o/products%2FGvAc6NCtubvgE0edJBGS%2Fb2c_main_1752147614007_b8b_sq_blister_glitt_06.webp?alt=media&token=0672f669-2404-44f7-b0a5-5834c34caec7"
    }];
    
    console.log('🔍 Cart items before saving:', JSON.stringify(cartItems, null, 2));
    
    // Create order data (same structure as Checkout.jsx)
    const orderData = {
      orderNumber: `TEST-${Date.now()}`,
      status: 'confirmed',
      source: 'b2c',
      items: cartItems, // ← Direct assignment like in Checkout.jsx
      customerInfo: {
        email: 'test@example.com',
        name: 'Test Customer',
        firstName: 'Test',
        lastName: 'Customer',
        marketingOptIn: false,
        preferredLang: 'sv-SE'
      },
      shippingInfo: {
        address: 'Test Address',
        apartment: '',
        city: 'Test City',
        country: 'SE',
        postalCode: '12345'
      },
      payment: {
        method: 'test',
        status: 'succeeded',
        amount: 3,
        currency: 'sek'
      },
      subtotal: 2,
      shipping: 1,
      vat: 0.6,
      total: 3,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('🔍 Order data before saving:', JSON.stringify({
      ...orderData,
      createdAt: '[SERVER_TIMESTAMP]',
      updatedAt: '[SERVER_TIMESTAMP]'
    }, null, 2));
    
    // Save to named database
    const orderRef = await namedDb.collection('orders').add(orderData);
    console.log('✅ Test order created with ID:', orderRef.id);
    
    // Read it back to see what was actually saved
    const savedOrder = await orderRef.get();
    const savedData = savedOrder.data();
    
    console.log('🔍 Saved order items:', JSON.stringify(savedData.items, null, 2));
    
    // Check if color and size are present
    const firstItem = savedData.items[0];
    console.log('🔍 First item color:', firstItem.color, '(type:', typeof firstItem.color, ')');
    console.log('🔍 First item size:', firstItem.size, '(type:', typeof firstItem.size, ')');
    
    if (firstItem.color && firstItem.size) {
      console.log('✅ SUCCESS: Color and size fields are present in database!');
    } else {
      console.log('❌ PROBLEM: Color and/or size fields are missing in database!');
    }
    
    // Clean up - delete the test order
    await orderRef.delete();
    console.log('🧹 Test order cleaned up');
    
  } catch (error) {
    console.error('❌ Error creating test order:', error);
  }
}

debugB2COrderCreation();
