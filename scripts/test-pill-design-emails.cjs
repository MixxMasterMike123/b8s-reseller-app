const nodemailer = require('nodemailer');

// Import the email templates directly
const { generateOrderConfirmationTemplate } = require('../functions/src/email-orchestrator/templates/orderConfirmation.ts');
const { generateOrderNotificationAdminTemplate } = require('../functions/src/email-orchestrator/templates/orderNotificationAdmin.ts');

// Test data with color and size information
const testOrderData = {
  orderNumber: 'B8S-TEST-PILL',
  items: [
    {
      id: 'test1',
      name: 'B8Shield Glitter',
      color: 'Glitter',
      size: '6',
      quantity: 1,
      price: 99,
      image: 'https://firebasestorage.googleapis.com/v0/b/b8shield-reseller-app.firebasestorage.app/o/products%2FGvAc6NCtubvgE0edJBGS%2Fb2c_main_1752147614007_b8b_sq_blister_glitt_06.webp?alt=media&token=0672f669-2404-44f7-b0a5-5834c34caec7'
    },
    {
      id: 'test2', 
      name: 'B8Shield Transparent',
      color: 'Transparent',
      size: '4',
      quantity: 2,
      price: 89
    }
  ],
  subtotal: 277,
  shipping: 29,
  vat: 69.25,
  total: 375.25,
  customerInfo: {
    firstName: 'Test',
    lastName: 'Pill Design',
    email: 'micke.ohlen@gmail.com',
    name: 'Test Pill Design'
  },
  shippingInfo: {
    address: 'Test Street 123',
    city: 'Stockholm',
    postalCode: '12345',
    country: 'SE'
  }
};

const testCustomerInfo = {
  firstName: 'Test',
  lastName: 'Pill Design', 
  email: 'micke.ohlen@gmail.com',
  name: 'Test Pill Design'
};

// Create transporter for sending test emails
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // You'll need to configure this
    pass: 'your-app-password'     // You'll need to configure this
  }
});

async function testPillDesignEmails() {
  console.log('🎨 Testing new pill design in email templates...\n');

  try {
    // Test Customer Order Confirmation Email
    console.log('📧 Generating Customer Order Confirmation with Pill Design...');
    const customerEmailData = {
      orderData: testOrderData,
      customerInfo: testCustomerInfo,
      orderId: 'test-order-id-123',
      orderType: 'B2C'
    };
    
    const customerEmail = generateOrderConfirmationTemplate(customerEmailData, 'sv-SE', 'test-order-id-123');
    console.log('✅ Customer email generated successfully');
    console.log('📝 Subject:', customerEmail.subject);
    
    // Test Admin Order Notification Email
    console.log('\n📧 Generating Admin Order Notification with Pill Design...');
    const adminEmailData = {
      orderData: testOrderData,
      userData: {
        email: 'micke.ohlen@gmail.com',
        name: 'Test Pill Design',
        type: 'B2C'
      },
      source: 'b2c'
    };
    
    const adminEmail = generateOrderNotificationAdminTemplate(adminEmailData, 'sv-SE');
    console.log('✅ Admin email generated successfully');
    console.log('📝 Subject:', adminEmail.subject);
    
    // Save HTML files for manual inspection
    const fs = require('fs');
    fs.writeFileSync('/tmp/customer-email-pill-design.html', customerEmail.html);
    fs.writeFileSync('/tmp/admin-email-pill-design.html', adminEmail.html);
    
    console.log('\n🎨 PILL DESIGN TEST COMPLETE!');
    console.log('📁 HTML files saved:');
    console.log('   - Customer: /tmp/customer-email-pill-design.html');
    console.log('   - Admin: /tmp/admin-email-pill-design.html');
    console.log('\n💡 Open these files in your browser to see the new pill design!');
    
    // Show pill design preview
    console.log('\n🔍 Expected Pill Design:');
    console.log('   Product: B8Shield Glitter');
    console.log('   Pills: [Färg: Glitter] [Storlek: 6]');
    console.log('   Product: B8Shield Transparent');
    console.log('   Pills: [Färg: Transparent] [Storlek: 4]');
    
  } catch (error) {
    console.error('❌ Error testing pill design:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPillDesignEmails();
