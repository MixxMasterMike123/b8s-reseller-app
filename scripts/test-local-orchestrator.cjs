#!/usr/bin/env node

/**
 * Local Email Orchestrator Test Script
 * 
 * Tests the orchestrator system locally before deployment
 * Sends test emails to micke.ohlen@gmail.com using local code
 */

const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Load service account
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://b8shield-reseller-app-default-rtdb.firebaseio.com/'
});

const db = getFirestore(app, 'b8s-reseller-db');

// Test email address
const TEST_EMAIL = 'micke.ohlen@gmail.com';

console.log('🧪 B8Shield Email Orchestrator LOCAL Test');
console.log('📧 Test emails will be sent to:', TEST_EMAIL);
console.log('💻 Testing local orchestrator code before deployment\n');

// Mock data
const mockOrderData = {
  orderNumber: 'B8S-TEST-001',
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
  subtotal: 308.00,
  shipping: 19.00,
  vat: 81.75,
  total: 408.75,
  discountAmount: 40.88,
  affiliateCode: 'TESTKOD'
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

async function testLocalOrchestrator() {
  console.log('📧 Testing Local EmailOrchestrator...\n');
  
  try {
    // Import the local orchestrator
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    console.log('✅ EmailOrchestrator imported successfully');
    
    // Test 1: Order Confirmation Email (B2C)
    console.log('\n1️⃣ Testing B2C Order Confirmation...');
    const orderResult = await orchestrator.sendEmail({
      emailType: 'ORDER_CONFIRMATION',
      customerInfo: mockCustomerInfo,
      orderId: 'test-local-001',
      source: 'b2c',
      language: 'sv-SE',
      orderData: mockOrderData
    });
    
    if (orderResult.success) {
      console.log('✅ B2C Order Confirmation sent successfully');
    } else {
      console.log('❌ B2C Order Confirmation failed:', orderResult.error);
    }
    
    await delay(2000);
    
    // Test 2: Email Verification
    console.log('\n2️⃣ Testing Email Verification...');
    const verificationResult = await orchestrator.sendEmail({
      emailType: 'EMAIL_VERIFICATION',
      customerInfo: mockCustomerInfo,
      language: 'sv-SE',
      additionalData: {
        verificationCode: 'local-test-verification-123456789',
        source: 'registration'
      }
    });
    
    if (verificationResult.success) {
      console.log('✅ Email Verification sent successfully');
    } else {
      console.log('❌ Email Verification failed:', verificationResult.error);
    }
    
    await delay(2000);
    
    // Test 3: Password Reset
    console.log('\n3️⃣ Testing Password Reset...');
    const passwordResult = await orchestrator.sendEmail({
      emailType: 'PASSWORD_RESET',
      customerInfo: mockCustomerInfo,
      language: 'sv-SE',
      additionalData: {
        resetCode: 'local-test-reset-123456',
        userAgent: 'Mozilla/5.0 (Local Test)',
        timestamp: new Date().toLocaleString('sv-SE'),
        userType: 'B2C'
      }
    });
    
    if (passwordResult.success) {
      console.log('✅ Password Reset sent successfully');
    } else {
      console.log('❌ Password Reset failed:', passwordResult.error);
    }
    
    await delay(2000);
    
    // Test 4: Affiliate Welcome
    console.log('\n4️⃣ Testing Affiliate Welcome...');
    const affiliateResult = await orchestrator.sendEmail({
      emailType: 'AFFILIATE_WELCOME',
      customerInfo: mockCustomerInfo,
      language: 'sv-SE',
      additionalData: {
        affiliateInfo: {
          name: 'Mikael Öhlén',
          email: TEST_EMAIL,
          affiliateCode: 'MIKAEL-TEST-123',
          commissionRate: 15,
          checkoutDiscount: 10
        },
        credentials: {
          email: TEST_EMAIL,
          temporaryPassword: 'LocalTest123!'
        },
        wasExistingAuthUser: false
      }
    });
    
    if (affiliateResult.success) {
      console.log('✅ Affiliate Welcome sent successfully');
    } else {
      console.log('❌ Affiliate Welcome failed:', affiliateResult.error);
    }
    
    await delay(2000);
    
    // Test 5: Login Credentials (B2B)
    console.log('\n5️⃣ Testing B2B Login Credentials...');
    const credentialsResult = await orchestrator.sendEmail({
      emailType: 'LOGIN_CREDENTIALS',
      customerInfo: {
        ...mockCustomerInfo,
        companyName: 'Test Company AB'
      },
      language: 'sv-SE',
      additionalData: {
        credentials: {
          email: TEST_EMAIL,
          temporaryPassword: 'B2BTest123!'
        },
        accountType: 'B2B',
        wasExistingAuthUser: false
      }
    });
    
    if (credentialsResult.success) {
      console.log('✅ B2B Login Credentials sent successfully');
    } else {
      console.log('❌ B2B Login Credentials failed:', credentialsResult.error);
    }
    
    await delay(2000);
    
    // Test 6: Order Status Update
    console.log('\n6️⃣ Testing Order Status Update...');
    const statusResult = await orchestrator.sendEmail({
      emailType: 'ORDER_STATUS_UPDATE',
      customerInfo: mockCustomerInfo,
      orderId: 'test-status-001',
      language: 'sv-SE',
      orderData: {
        ...mockOrderData,
        status: 'shipped'
      },
      additionalData: {
        newStatus: 'shipped',
        previousStatus: 'processing',
        trackingNumber: 'LOCAL123456789SE',
        estimatedDelivery: '2025-01-20',
        notes: 'Lokalt test - ditt paket är på väg!'
      }
    });
    
    if (statusResult.success) {
      console.log('✅ Order Status Update sent successfully');
    } else {
      console.log('❌ Order Status Update failed:', statusResult.error);
    }
    
    await delay(2000);
    
    // Test 7: Admin Order Notification
    console.log('\n7️⃣ Testing Admin Order Notification...');
    const adminResult = await orchestrator.sendEmail({
      emailType: 'ORDER_NOTIFICATION_ADMIN',
      customerInfo: mockCustomerInfo,
      orderId: 'test-admin-001',
      source: 'b2c',
      language: 'sv-SE',
      orderData: mockOrderData,
      adminEmail: true
    });
    
    if (adminResult.success) {
      console.log('✅ Admin Order Notification sent successfully');
    } else {
      console.log('❌ Admin Order Notification failed:', adminResult.error);
    }
    
    console.log('\n🎉 Local Email Orchestrator Test Complete!');
    console.log('📧 Check your inbox at:', TEST_EMAIL);
    console.log('🔍 Verify all templates, links, and mobile compatibility');
    console.log('📱 Test on different email clients');
    console.log('\n💡 If all tests pass, you can deploy with: firebase deploy --only functions');
    
  } catch (error) {
    console.error('❌ Local test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testLocalOrchestrator().then(() => {
  console.log('\n✅ Local test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Local test failed:', error);
  process.exit(1);
});
