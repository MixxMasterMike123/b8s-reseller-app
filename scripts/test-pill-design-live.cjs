// Test the new pill design by making a real B2C order
// This will trigger both customer and admin emails with the new pill design

const testOrderData = {
  // Use the order processing HTTP function to trigger emails
  customerInfo: {
    firstName: 'Pill',
    lastName: 'Design Test',
    email: 'micke.ohlen@gmail.com',
    name: 'Pill Design Test',
    preferredLang: 'sv-SE'
  },
  items: [
    {
      id: 'GvAc6NCtubvgE0edJBGS', // Real B8Shield Glitter product
      name: { 'sv-SE': 'B8Shield Glitter' },
      color: 'Glitter',
      size: '6',
      quantity: 1,
      price: 99,
      sku: 'B8S-6-gl',
      image: 'https://firebasestorage.googleapis.com/v0/b/b8shield-reseller-app.firebasestorage.app/o/products%2FGvAc6NCtubvgE0edJBGS%2Fb2c_main_1752147614007_b8b_sq_blister_glitt_06.webp?alt=media&token=0672f669-2404-44f7-b0a5-5834c34caec7'
    }
  ],
  orderNumber: 'B8S-PILL-TEST-' + Date.now(),
  subtotal: 99,
  shipping: 29,
  vat: 24.75,
  total: 152.75,
  source: 'b2c',
  status: 'confirmed',
  shippingInfo: {
    address: 'Test Street 123',
    apartment: '',
    city: 'Stockholm', 
    postalCode: '12345',
    country: 'SE'
  },
  payment: {
    method: 'test',
    status: 'succeeded',
    amount: 152.75,
    currency: 'sek'
  }
};

async function testPillDesignLive() {
  console.log('🎨 Testing new pill design with live Firebase Functions...\n');
  
  try {
    console.log('📧 Triggering order processing to test pill design emails...');
    console.log('🔍 Expected pill design:');
    console.log('   Product: B8Shield Glitter');
    console.log('   Pills: [Färg: Glitter] [Storlek: 6]');
    console.log('');
    
    // Call the order processing function
    const response = await fetch('https://processb2cordercompletionhttpv2-csdvvcrpzq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: 'pill-test-' + Date.now(),
        orderData: testOrderData
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Order processing completed successfully!');
      console.log('📧 Both customer and admin emails should have been sent with pill design');
      console.log('📬 Check email: micke.ohlen@gmail.com');
      console.log('');
      console.log('🎯 Look for:');
      console.log('   - Clean product name: "B8Shield Glitter"');
      console.log('   - Pill row below name with: [Färg: Glitter] [Storlek: 6]');
      console.log('   - Gray rounded pills with borders');
      console.log('');
      console.log('Result:', result);
    } else {
      console.error('❌ Order processing failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing pill design:', error);
  }
}

// Run the test
testPillDesignLive();
