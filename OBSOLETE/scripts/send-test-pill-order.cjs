// Send a test order email using the new pill design
// This will call the Firebase Functions directly to send both customer and admin emails

async function sendTestPillOrder() {
  console.log('🎨 Sending test order with beautiful pill design...\n');
  
  const testOrderData = {
    orderNumber: 'B8S-PILL-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    items: [
      {
        id: 'GvAc6NCtubvgE0edJBGS',
        name: { 'sv-SE': 'B8Shield Glitter' },
        color: 'Glitter',
        size: '6',
        quantity: 1,
        price: 99,
        sku: 'B8S-6-gl',
        image: 'https://firebasestorage.googleapis.com/v0/b/b8shield-reseller-app.firebasestorage.app/o/products%2FGvAc6NCtubvgE0edJBGS%2Fb2c_main_1752147614007_b8b_sq_blister_glitt_06.webp?alt=media&token=0672f669-2404-44f7-b0a5-5834c34caec7'
      },
      {
        id: 'test-transparent',
        name: { 'sv-SE': 'B8Shield Transparent' },
        color: 'Transparent', 
        size: '4',
        quantity: 2,
        price: 89,
        sku: 'B8S-4-tr'
      }
    ],
    subtotal: 277,
    shipping: 29,
    vat: 69.25,
    total: 375.25,
    customerInfo: {
      firstName: 'Pill',
      lastName: 'Design Test',
      email: 'micke.ohlen@gmail.com',
      name: 'Pill Design Test',
      preferredLang: 'sv-SE'
    },
    shippingInfo: {
      address: 'Test Street 123',
      apartment: '',
      city: 'Stockholm',
      postalCode: '12345',
      country: 'SE'
    },
    source: 'b2c',
    status: 'confirmed'
  };

  const testOrderId = 'pill-test-' + Date.now();

  try {
    // Send Customer Order Confirmation Email
    console.log('📧 Sending customer order confirmation with pill design...');
    const customerResponse = await fetch('https://sendorderconfirmationemail-csdvvcrpzq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          orderData: testOrderData,
          customerInfo: testOrderData.customerInfo,
          orderId: testOrderId,
          source: 'b2c',
          language: 'sv-SE'
        }
      })
    });

    if (customerResponse.ok) {
      const customerResult = await customerResponse.json();
      console.log('✅ Customer email sent successfully!');
      console.log('📬 Check: micke.ohlen@gmail.com');
    } else {
      console.error('❌ Customer email failed:', customerResponse.status);
      const errorText = await customerResponse.text();
      console.error('Error:', errorText);
    }

    // Send Admin Order Notification Email
    console.log('\n📧 Sending admin order notification with pill design...');
    const adminResponse = await fetch('https://sendordernotificationadminemail-csdvvcrpzq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          orderData: testOrderData,
          userData: {
            email: 'micke.ohlen@gmail.com',
            name: 'Pill Design Test',
            type: 'B2C'
          },
          source: 'b2c',
          language: 'sv-SE'
        }
      })
    });

    if (adminResponse.ok) {
      const adminResult = await adminResponse.json();
      console.log('✅ Admin email sent successfully!');
      console.log('📬 Check: micke.ohlen@gmail.com');
    } else {
      console.error('❌ Admin email failed:', adminResponse.status);
      const errorText = await adminResponse.text();
      console.error('Error:', errorText);
    }

    console.log('\n🎨 PILL DESIGN TEST COMPLETE!');
    console.log('🔍 Look for these beautiful pills in the emails:');
    console.log('   Product: B8Shield Glitter');
    console.log('   Pills: [Färg: Glitter] [Storlek: 6]');
    console.log('');
    console.log('   Product: B8Shield Transparent');
    console.log('   Pills: [Färg: Transparent] [Storlek: 4]');
    console.log('');
    console.log('💡 Pills should appear as rounded gray badges on a secondary row!');

  } catch (error) {
    console.error('❌ Error sending test order:', error);
  }
}

// Run the test
sendTestPillOrder();


