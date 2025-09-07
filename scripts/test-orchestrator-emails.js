#!/usr/bin/env node

/**
 * Email Orchestrator Test Script
 * 
 * Tests all new orchestrator email functions by sending test emails to micke.ohlen@gmail.com
 * This allows testing all templates, links, and functionality before deployment.
 * 
 * Usage: node scripts/test-orchestrator-emails.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');
const { getAuth } = require('firebase-admin/auth');

// Load service account
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://b8shield-reseller-app-default-rtdb.firebaseio.com/'
});

const db = getFirestore(app, 'b8s-reseller-db');
const auth = getAuth(app);

// Test email address
const TEST_EMAIL = 'micke.ohlen@gmail.com';
const TEST_NAME = 'Mikael Öhlén';

console.log('🧪 B8Shield Email Orchestrator Test Suite');
console.log('📧 Test emails will be sent to:', TEST_EMAIL);
console.log('⚠️  Make sure Firebase Functions are deployed first!\n');

// Mock data for testing
const mockOrderData = {
  orderNumber: 'B8S-TEST-001',
  items: [
    {
      name: 'B8Shield Skydd - 4-pack',
      color: 'Transparent',
      size: '4-pack',
      quantity: 2,
      price: 159.20,
      image: 'https://example.com/b8shield-4pack.jpg'
    },
    {
      name: 'B8Shield Skydd - 2-pack',
      color: 'Röd',
      size: '2-pack', 
      quantity: 1,
      price: 89.60,
      image: 'https://example.com/b8shield-2pack.jpg'
    }
  ],
  subtotal: 308.00,
  shipping: 19.00,
  vat: 81.75,
  total: 408.75,
  discountAmount: 40.88,
  affiliateCode: 'TEST-AFFILIATE'
};

const mockCustomerInfo = {
  firstName: 'Mikael',
  lastName: 'Öhlén',
  name: 'Mikael Öhlén',
  email: TEST_EMAIL
};

const mockAffiliateInfo = {
  name: 'Test Affiliate',
  email: TEST_EMAIL,
  affiliateCode: 'TEST-AFF-123',
  commissionRate: 15,
  checkoutDiscount: 10
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testOrderConfirmationEmail() {
  console.log('📧 Testing Order Confirmation Email...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    // Test B2C Order Confirmation
    const result = await orchestrator.sendEmail({
      emailType: 'ORDER_CONFIRMATION',
      customerInfo: mockCustomerInfo,
      orderId: 'test-order-b2c-001',
      source: 'b2c',
      language: 'sv-SE',
      orderData: mockOrderData
    });
    
    if (result.success) {
      console.log('✅ B2C Order Confirmation sent successfully');
    } else {
      console.log('❌ B2C Order Confirmation failed:', result.error);
    }
    
    await delay(2000);
    
    // Test B2B Order Confirmation  
    const resultB2B = await orchestrator.sendEmail({
      emailType: 'ORDER_CONFIRMATION',
      userId: 'test-user-b2b',
      customerInfo: {
        ...mockCustomerInfo,
        companyName: 'Test Company AB'
      },
      orderId: 'test-order-b2b-001',
      source: 'b2b',
      language: 'sv-SE',
      orderData: mockOrderData
    });
    
    if (resultB2B.success) {
      console.log('✅ B2B Order Confirmation sent successfully');
    } else {
      console.log('❌ B2B Order Confirmation failed:', resultB2B.error);
    }
    
  } catch (error) {
    console.log('❌ Order Confirmation test failed:', error.message);
  }
}

async function testOrderStatusUpdateEmail() {
  console.log('📧 Testing Order Status Update Email...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    const result = await orchestrator.sendEmail({
      emailType: 'ORDER_STATUS_UPDATE',
      customerInfo: mockCustomerInfo,
      orderId: 'test-order-status-001',
      language: 'sv-SE',
      orderData: {
        ...mockOrderData,
        status: 'shipped'
      },
      additionalData: {
        newStatus: 'shipped',
        previousStatus: 'processing',
        trackingNumber: 'TEST123456789SE',
        estimatedDelivery: '2025-01-20',
        notes: 'Ditt paket är nu på väg!'
      }
    });
    
    if (result.success) {
      console.log('✅ Order Status Update sent successfully');
    } else {
      console.log('❌ Order Status Update failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Order Status Update test failed:', error.message);
  }
}

async function testOrderNotificationAdminEmail() {
  console.log('📧 Testing Admin Order Notification Email...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    const result = await orchestrator.sendEmail({
      emailType: 'ORDER_NOTIFICATION_ADMIN',
      customerInfo: mockCustomerInfo,
      orderId: 'test-admin-order-001',
      source: 'b2c',
      language: 'sv-SE',
      orderData: mockOrderData,
      adminEmail: true
    });
    
    if (result.success) {
      console.log('✅ Admin Order Notification sent successfully');
    } else {
      console.log('❌ Admin Order Notification failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Admin Order Notification test failed:', error.message);
  }
}

async function testPasswordResetEmail() {
  console.log('📧 Testing Password Reset Email...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    const result = await orchestrator.sendEmail({
      emailType: 'PASSWORD_RESET',
      customerInfo: mockCustomerInfo,
      language: 'sv-SE',
      additionalData: {
        resetCode: 'test-reset-code-123456',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        timestamp: new Date().toLocaleString('sv-SE'),
        userType: 'B2C'
      }
    });
    
    if (result.success) {
      console.log('✅ Password Reset email sent successfully');
    } else {
      console.log('❌ Password Reset email failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Password Reset test failed:', error.message);
  }
}

async function testLoginCredentialsEmail() {
  console.log('📧 Testing Login Credentials Email (B2B)...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    const result = await orchestrator.sendEmail({
      emailType: 'LOGIN_CREDENTIALS',
      customerInfo: {
        ...mockCustomerInfo,
        companyName: 'Test Company AB'
      },
      language: 'sv-SE',
      additionalData: {
        credentials: {
          email: TEST_EMAIL,
          temporaryPassword: 'TestPass123!'
        },
        accountType: 'B2B',
        wasExistingAuthUser: false
      }
    });
    
    if (result.success) {
      console.log('✅ B2B Login Credentials email sent successfully');
    } else {
      console.log('❌ B2B Login Credentials email failed:', result.error);
    }
    
    await delay(2000);
    
    // Test Affiliate Login Credentials
    console.log('📧 Testing Login Credentials Email (Affiliate)...');
    
    const resultAffiliate = await orchestrator.sendEmail({
      emailType: 'LOGIN_CREDENTIALS',
      customerInfo: mockCustomerInfo,
      language: 'sv-SE',
      additionalData: {
        credentials: {
          email: TEST_EMAIL,
          affiliateCode: 'TEST-AFF-123',
          temporaryPassword: 'AffPass123!'
        },
        accountType: 'AFFILIATE',
        wasExistingAuthUser: false
      }
    });
    
    if (resultAffiliate.success) {
      console.log('✅ Affiliate Login Credentials email sent successfully');
    } else {
      console.log('❌ Affiliate Login Credentials email failed:', resultAffiliate.error);
    }
    
  } catch (error) {
    console.log('❌ Login Credentials test failed:', error.message);
  }
}

async function testAffiliateWelcomeEmail() {
  console.log('📧 Testing Affiliate Welcome Email...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    const result = await orchestrator.sendEmail({
      emailType: 'AFFILIATE_WELCOME',
      customerInfo: mockCustomerInfo,
      language: 'sv-SE',
      additionalData: {
        affiliateInfo: mockAffiliateInfo,
        credentials: {
          email: TEST_EMAIL,
          temporaryPassword: 'AffWelcome123!'
        },
        wasExistingAuthUser: false
      }
    });
    
    if (result.success) {
      console.log('✅ Affiliate Welcome email sent successfully');
    } else {
      console.log('❌ Affiliate Welcome email failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Affiliate Welcome test failed:', error.message);
  }
}

async function testEmailVerificationEmail() {
  console.log('📧 Testing Email Verification Email...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    const result = await orchestrator.sendEmail({
      emailType: 'EMAIL_VERIFICATION',
      customerInfo: mockCustomerInfo,
      language: 'sv-SE',
      additionalData: {
        verificationCode: 'test-verification-code-123456789',
        source: 'registration'
      }
    });
    
    if (result.success) {
      console.log('✅ Email Verification email sent successfully');
    } else {
      console.log('❌ Email Verification email failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Email Verification test failed:', error.message);
  }
}

async function testOrchestratorSystem() {
  console.log('🧪 Testing EmailOrchestrator System...');
  
  try {
    const { EmailOrchestrator } = require('../functions/lib/email-orchestrator/core/EmailOrchestrator');
    const orchestrator = new EmailOrchestrator();
    
    const testResult = await orchestrator.testSystem();
    
    if (testResult.success) {
      console.log('✅ EmailOrchestrator system test passed');
      console.log('📊 Test details:', testResult.details);
    } else {
      console.log('❌ EmailOrchestrator system test failed:', testResult.error);
    }
    
  } catch (error) {
    console.log('❌ Orchestrator system test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Email Orchestrator Test Suite...\n');
  
  try {
    // Test orchestrator system first
    await testOrchestratorSystem();
    await delay(3000);
    
    // Test all email types
    await testOrderConfirmationEmail();
    await delay(3000);
    
    await testOrderStatusUpdateEmail();
    await delay(3000);
    
    await testOrderNotificationAdminEmail();
    await delay(3000);
    
    await testPasswordResetEmail();
    await delay(3000);
    
    await testLoginCredentialsEmail();
    await delay(3000);
    
    await testAffiliateWelcomeEmail();
    await delay(3000);
    
    await testEmailVerificationEmail();
    
    console.log('\n🎉 Email Orchestrator Test Suite Complete!');
    console.log('📧 Check your inbox at:', TEST_EMAIL);
    console.log('🔗 Test all links and verify email formatting');
    console.log('📱 Check mobile email app compatibility');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test suite
runAllTests().then(() => {
  console.log('\n✅ Test script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test script failed:', error);
  process.exit(1);
});
