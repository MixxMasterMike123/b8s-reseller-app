#!/usr/bin/env node

/**
 * Test Deployed Firebase Functions
 * 
 * Calls deployed Firebase Functions to send test emails to micke.ohlen@gmail.com
 * Run this AFTER deploying functions with: firebase deploy --only functions
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFunctions } = require('firebase-admin/functions');
const { httpsCallable } = require('firebase/functions');
const { initializeApp: initializeClientApp } = require('firebase/app');
const { getFunctions: getClientFunctions } = require('firebase/functions');

// Firebase client config (for calling functions)
const firebaseConfig = {
  projectId: "b8shield-reseller-app",
  // Add other config if needed
};

const clientApp = initializeClientApp(firebaseConfig);
const functions = getClientFunctions(clientApp);

// Test email address
const TEST_EMAIL = 'micke.ohlen@gmail.com';

console.log('🧪 B8Shield Deployed Functions Test');
console.log('📧 Test emails will be sent to:', TEST_EMAIL);
console.log('🚀 Testing deployed Firebase Functions\n');

// Mock data
const mockOrderData = {
  orderNumber: 'B8S-DEPLOYED-TEST-001',
  items: [
    {
      name: 'B8Shield Skydd - 4-pack',
      color: 'Transparent',
      size: '4-pack',
      quantity: 2,
      price: 159.20,
      image: 'https://firebasestorage.googleapis.com/v0/b/b8shield-reseller-app.appspot.com/o/products%2Fb8shield-4pack.jpg'
    },
    {
      name: 'B8Shield Skydd - 2-pack', 
      color: 'Röd',
      size: '2-pack',
      quantity: 1,
      price: 89.60,
      image: 'https://firebasestorage.googleapis.com/v0/b/b8shield-reseller-app.appspot.com/o/products%2Fb8shield-2pack.jpg'
    }
  ],
  subtotal: 497.60,
  shipping: 19.00,
  vat: 129.15,
  total: 645.75,
  discountAmount: 64.58,
  affiliateCode: 'DEPLOYED-TEST'
};

const mockCustomerInfo = {
  firstName: 'Mikael',
  lastName: 'Öhlén', 
  name: 'Mikael Öhlén',
  email: TEST_EMAIL
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testOrderConfirmationEmail() {
  console.log('1️⃣ Testing Order Confirmation Email (Deployed)...');
  
  try {
    const sendOrderConfirmationEmail = httpsCallable(functions, 'sendOrderConfirmationEmail');
    
    const result = await sendOrderConfirmationEmail({
      orderData: mockOrderData,
      customerInfo: mockCustomerInfo,
      orderId: 'deployed-test-order-001',
      source: 'b2c',
      language: 'sv-SE'
    });
    
    if (result.data.success) {
      console.log('✅ Order Confirmation sent successfully');
      console.log('📧 Message ID:', result.data.messageId);
    } else {
      console.log('❌ Order Confirmation failed:', result.data.error);
    }
    
  } catch (error) {
    console.log('❌ Order Confirmation function call failed:', error.message);
  }
}

async function testCustomEmailVerification() {
  console.log('2️⃣ Testing Custom Email Verification (Deployed)...');
  
  try {
    const sendCustomEmailVerification = httpsCallable(functions, 'sendCustomEmailVerification');
    
    const result = await sendCustomEmailVerification({
      customerInfo: mockCustomerInfo,
      firebaseAuthUid: 'deployed-test-uid-123',
      source: 'registration',
      language: 'sv-SE'
    });
    
    if (result.data.success) {
      console.log('✅ Email Verification sent successfully');
      console.log('📧 Message ID:', result.data.messageId);
      console.log('🔐 Verification Code:', result.data.verificationCode);
    } else {
      console.log('❌ Email Verification failed:', result.data.error);
    }
    
  } catch (error) {
    console.log('❌ Email Verification function call failed:', error.message);
  }
}

async function testPasswordResetEmail() {
  console.log('3️⃣ Testing Password Reset Email (Deployed)...');
  
  try {
    const sendPasswordResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');
    
    const result = await sendPasswordResetEmail({
      email: TEST_EMAIL,
      resetCode: 'deployed-test-reset-123456',
      userAgent: 'Mozilla/5.0 (Deployed Test)',
      timestamp: new Date().toLocaleString('sv-SE'),
      userType: 'B2C',
      language: 'sv-SE'
    });
    
    if (result.data.success) {
      console.log('✅ Password Reset sent successfully');
      console.log('📧 Message ID:', result.data.messageId);
    } else {
      console.log('❌ Password Reset failed:', result.data.error);
    }
    
  } catch (error) {
    console.log('❌ Password Reset function call failed:', error.message);
  }
}

async function testAffiliateWelcomeEmail() {
  console.log('4️⃣ Testing Affiliate Welcome Email (Deployed)...');
  
  try {
    const sendAffiliateWelcomeEmail = httpsCallable(functions, 'sendAffiliateWelcomeEmail');
    
    const result = await sendAffiliateWelcomeEmail({
      affiliateInfo: {
        name: 'Mikael Öhlén',
        email: TEST_EMAIL,
        affiliateCode: 'DEPLOYED-TEST-123',
        commissionRate: 15,
        checkoutDiscount: 10
      },
      credentials: {
        email: TEST_EMAIL,
        temporaryPassword: 'DeployedTest123!'
      },
      wasExistingAuthUser: false,
      language: 'sv-SE'
    });
    
    if (result.data.success) {
      console.log('✅ Affiliate Welcome sent successfully');
      console.log('📧 Message ID:', result.data.messageId);
    } else {
      console.log('❌ Affiliate Welcome failed:', result.data.error);
    }
    
  } catch (error) {
    console.log('❌ Affiliate Welcome function call failed:', error.message);
  }
}

async function testLoginCredentialsEmail() {
  console.log('5️⃣ Testing Login Credentials Email (Deployed)...');
  
  try {
    const sendLoginCredentialsEmail = httpsCallable(functions, 'sendLoginCredentialsEmail');
    
    const result = await sendLoginCredentialsEmail({
      userInfo: {
        name: 'Mikael Öhlén',
        email: TEST_EMAIL,
        companyName: 'Deployed Test Company AB'
      },
      credentials: {
        email: TEST_EMAIL,
        temporaryPassword: 'DeployedB2B123!'
      },
      accountType: 'B2B',
      wasExistingAuthUser: false,
      userId: 'deployed-test-user-123',
      language: 'sv-SE'
    });
    
    if (result.data.success) {
      console.log('✅ Login Credentials sent successfully');
      console.log('📧 Message ID:', result.data.messageId);
    } else {
      console.log('❌ Login Credentials failed:', result.data.error);
    }
    
  } catch (error) {
    console.log('❌ Login Credentials function call failed:', error.message);
  }
}

async function testOrderStatusUpdateEmail() {
  console.log('6️⃣ Testing Order Status Update Email (Deployed)...');
  
  try {
    const sendOrderStatusUpdateEmail = httpsCallable(functions, 'sendOrderStatusUpdateEmail');
    
    const result = await sendOrderStatusUpdateEmail({
      orderData: {
        ...mockOrderData,
        status: 'shipped'
      },
      userData: {
        email: TEST_EMAIL,
        name: 'Mikael Öhlén',
        type: 'B2C'
      },
      newStatus: 'shipped',
      previousStatus: 'processing',
      trackingNumber: 'DEPLOYED123456789SE',
      estimatedDelivery: '2025-01-20',
      notes: 'Deployed test - ditt paket är på väg!',
      orderId: 'deployed-status-test-001',
      language: 'sv-SE'
    });
    
    if (result.data.success) {
      console.log('✅ Order Status Update sent successfully');
      console.log('📧 Message ID:', result.data.messageId);
    } else {
      console.log('❌ Order Status Update failed:', result.data.error);
    }
    
  } catch (error) {
    console.log('❌ Order Status Update function call failed:', error.message);
  }
}

async function testOrderNotificationAdminEmail() {
  console.log('7️⃣ Testing Admin Order Notification Email (Deployed)...');
  
  try {
    const sendOrderNotificationAdmin = httpsCallable(functions, 'sendOrderNotificationAdmin');
    
    const result = await sendOrderNotificationAdmin({
      orderData: mockOrderData,
      customerInfo: mockCustomerInfo,
      orderId: 'deployed-admin-test-001',
      source: 'b2c',
      language: 'sv-SE'
    });
    
    if (result.data.success) {
      console.log('✅ Admin Order Notification sent successfully');
      console.log('📧 Message ID:', result.data.messageId);
    } else {
      console.log('❌ Admin Order Notification failed:', result.data.error);
    }
    
  } catch (error) {
    console.log('❌ Admin Order Notification function call failed:', error.message);
  }
}

async function runAllDeployedTests() {
  console.log('🚀 Starting Deployed Functions Test Suite...\n');
  
  try {
    await testOrderConfirmationEmail();
    await delay(3000);
    
    await testCustomEmailVerification();
    await delay(3000);
    
    await testPasswordResetEmail();
    await delay(3000);
    
    await testAffiliateWelcomeEmail();
    await delay(3000);
    
    await testLoginCredentialsEmail();
    await delay(3000);
    
    await testOrderStatusUpdateEmail();
    await delay(3000);
    
    await testOrderNotificationAdminEmail();
    
    console.log('\n🎉 Deployed Functions Test Suite Complete!');
    console.log('📧 Check your inbox at:', TEST_EMAIL);
    console.log('🔍 Verify all templates, links, and mobile compatibility');
    console.log('📱 Test on different email clients (Gmail, Outlook, iPhone, etc.)');
    console.log('🔗 Click all links to verify they work correctly');
    console.log('🎨 Check email formatting in both light and dark modes');
    
  } catch (error) {
    console.error('❌ Deployed test suite failed:', error);
    process.exit(1);
  }
}

// Run the test suite
runAllDeployedTests().then(() => {
  console.log('\n✅ Deployed functions test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Deployed functions test failed:', error);
  process.exit(1);
});
