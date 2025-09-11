// Send admin email with pill design
async function sendAdminPillEmail() {
  console.log('🎨 Sending admin order notification with pill design...\n');
  
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
        sku: 'B8S-6-gl'
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

  try {
    // Send Admin Order Notification Email using callable function
    console.log('📧 Sending admin order notification with pill design...');
    
    // Use Firebase Admin SDK to call the function
    const { initializeApp, getApps } = require('firebase-admin/app');
    const { getFunctions } = require('firebase-admin/functions');
    
    // Initialize Firebase Admin if not already done
    if (getApps().length === 0) {
      initializeApp();
    }
    
    const functions = getFunctions();
    const sendAdminEmail = functions.httpsCallable('sendOrderNotificationAdmin');
    
    const result = await sendAdminEmail({
      orderData: testOrderData,
      userData: {
        email: 'micke.ohlen@gmail.com',
        name: 'Pill Design Test',
        type: 'B2C'
      },
      source: 'b2c',
      language: 'sv-SE'
    });

    console.log('✅ Admin email sent successfully!');
    console.log('📬 Check: micke.ohlen@gmail.com');
    console.log('Result:', result.data);

    console.log('\n🎨 ADMIN PILL DESIGN TEST COMPLETE!');
    console.log('🔍 Look for these beautiful pills in the admin email:');
    console.log('   Product: B8Shield Glitter');
    console.log('   Pills: [Färg: Glitter] [Storlek: 6]');
    console.log('');
    console.log('   Product: B8Shield Transparent');
    console.log('   Pills: [Färg: Transparent] [Storlek: 4]');

  } catch (error) {
    console.error('❌ Error sending admin email:', error);
  }
}

// Run the test
sendAdminPillEmail();

