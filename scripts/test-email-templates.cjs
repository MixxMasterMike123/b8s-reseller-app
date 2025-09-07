#!/usr/bin/env node

/**
 * Email Template Test Script
 * 
 * Tests email templates directly by generating HTML and sending via SMTP
 * This bypasses Firebase Functions and tests the templates themselves
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

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

console.log('🧪 B8Shield Email Template Test');
console.log('📧 Test emails will be sent to:', TEST_EMAIL);
console.log('🎨 Testing template generation and SMTP sending\n');

// SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'b8shield.reseller@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password-here' // You'll need to set this
  }
});

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
    }
  ],
  subtotal: 318.40,
  shipping: 19.00,
  vat: 84.35,
  total: 421.75,
  discountAmount: 42.18,
  affiliateCode: 'TESTKOD'
};

const mockCustomerInfo = {
  firstName: 'Mikael',
  lastName: 'Öhlén',
  name: 'Mikael Öhlén',
  email: TEST_EMAIL
};

async function sendTestEmail(subject, html) {
  try {
    const mailOptions = {
      from: '"B8Shield Test" <b8shield.reseller@gmail.com>',
      to: TEST_EMAIL,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.log('❌ Email sending failed:', error.message);
    return false;
  }
}

async function testOrderConfirmationTemplate() {
  console.log('1️⃣ Testing Order Confirmation Template...');
  
  try {
    const { generateOrderConfirmationTemplate } = require('../functions/lib/email-orchestrator/templates/orderConfirmation');
    
    const template = generateOrderConfirmationTemplate({
      orderData: mockOrderData,
      customerInfo: mockCustomerInfo,
      orderId: 'test-order-001',
      orderType: 'B2C'
    }, 'sv-SE');
    
    await sendTestEmail(template.subject, template.html);
    
  } catch (error) {
    console.log('❌ Order Confirmation template test failed:', error.message);
  }
}

async function testEmailVerificationTemplate() {
  console.log('2️⃣ Testing Email Verification Template...');
  
  try {
    const { generateEmailVerificationTemplate } = require('../functions/lib/email-orchestrator/templates/emailVerification');
    
    const template = generateEmailVerificationTemplate({
      customerInfo: mockCustomerInfo,
      verificationCode: 'test-verification-123456789',
      language: 'sv-SE',
      source: 'registration'
    });
    
    await sendTestEmail(template.subject, template.html);
    
  } catch (error) {
    console.log('❌ Email Verification template test failed:', error.message);
  }
}

async function testPasswordResetTemplate() {
  console.log('3️⃣ Testing Password Reset Template...');
  
  try {
    const { generatePasswordResetTemplate } = require('../functions/lib/email-orchestrator/templates/passwordReset');
    
    const template = generatePasswordResetTemplate({
      email: TEST_EMAIL,
      resetCode: 'test-reset-123456',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      timestamp: new Date().toLocaleString('sv-SE'),
      userType: 'B2C'
    }, 'sv-SE');
    
    await sendTestEmail(template.subject, template.html);
    
  } catch (error) {
    console.log('❌ Password Reset template test failed:', error.message);
  }
}

async function testAffiliateWelcomeTemplate() {
  console.log('4️⃣ Testing Affiliate Welcome Template...');
  
  try {
    const { generateAffiliateWelcomeTemplate } = require('../functions/lib/email-orchestrator/templates/affiliateWelcome');
    
    const template = generateAffiliateWelcomeTemplate({
      affiliateInfo: {
        name: 'Mikael Öhlén',
        email: TEST_EMAIL,
        affiliateCode: 'MIKAEL-TEST-123',
        commissionRate: 15,
        checkoutDiscount: 10
      },
      credentials: {
        email: TEST_EMAIL,
        temporaryPassword: 'TestPass123!'
      },
      wasExistingAuthUser: false,
      language: 'sv-SE'
    });
    
    await sendTestEmail(template.subject, template.html);
    
  } catch (error) {
    console.log('❌ Affiliate Welcome template test failed:', error.message);
  }
}

async function testLoginCredentialsTemplate() {
  console.log('5️⃣ Testing Login Credentials Template...');
  
  try {
    const { generateLoginCredentialsTemplate } = require('../functions/lib/email-orchestrator/templates/loginCredentials');
    
    const template = generateLoginCredentialsTemplate({
      userInfo: {
        name: 'Mikael Öhlén',
        email: TEST_EMAIL,
        companyName: 'Test Company AB'
      },
      credentials: {
        email: TEST_EMAIL,
        temporaryPassword: 'B2BTest123!'
      },
      accountType: 'B2B',
      wasExistingAuthUser: false
    }, 'sv-SE');
    
    await sendTestEmail(template.subject, template.html);
    
  } catch (error) {
    console.log('❌ Login Credentials template test failed:', error.message);
  }
}

async function testOrderStatusUpdateTemplate() {
  console.log('6️⃣ Testing Order Status Update Template...');
  
  try {
    const { generateOrderStatusUpdateTemplate } = require('../functions/lib/email-orchestrator/templates/orderStatusUpdate');
    
    const template = generateOrderStatusUpdateTemplate({
      orderData: mockOrderData,
      userData: {
        email: TEST_EMAIL,
        name: 'Mikael Öhlén',
        type: 'B2C'
      },
      newStatus: 'shipped',
      previousStatus: 'processing',
      trackingNumber: 'TEST123456789SE',
      estimatedDelivery: '2025-01-20',
      notes: 'Ditt paket är nu på väg!',
      userType: 'B2C'
    }, 'sv-SE', 'test-order-001');
    
    await sendTestEmail(template.subject, template.html);
    
  } catch (error) {
    console.log('❌ Order Status Update template test failed:', error.message);
  }
}

async function testOrderNotificationAdminTemplate() {
  console.log('7️⃣ Testing Admin Order Notification Template...');
  
  try {
    const { generateOrderNotificationAdminTemplate } = require('../functions/lib/email-orchestrator/templates/orderNotificationAdmin');
    
    const template = generateOrderNotificationAdminTemplate({
      orderData: {
        ...mockOrderData,
        customerInfo: mockCustomerInfo
      },
      orderId: 'test-admin-001',
      orderType: 'B2C'
    }, 'sv-SE');
    
    await sendTestEmail(template.subject, template.html);
    
  } catch (error) {
    console.log('❌ Admin Order Notification template test failed:', error.message);
  }
}

async function runAllTemplateTests() {
  console.log('🚀 Starting Email Template Test Suite...\n');
  
  try {
    await testOrderConfirmationTemplate();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testEmailVerificationTemplate();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testPasswordResetTemplate();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testAffiliateWelcomeTemplate();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testLoginCredentialsTemplate();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testOrderStatusUpdateTemplate();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testOrderNotificationAdminTemplate();
    
    console.log('\n🎉 Email Template Test Suite Complete!');
    console.log('📧 Check your inbox at:', TEST_EMAIL);
    console.log('🔍 Verify all templates, links, and mobile compatibility');
    console.log('📱 Test on different email clients');
    console.log('\n💡 If all templates look good, you can deploy with: firebase deploy --only functions');
    
  } catch (error) {
    console.error('❌ Template test suite failed:', error);
    process.exit(1);
  }
}

// Check if we have SMTP credentials
if (!process.env.GMAIL_APP_PASSWORD) {
  console.log('⚠️  Gmail App Password not set in environment variables');
  console.log('📧 Set GMAIL_APP_PASSWORD environment variable to send actual emails');
  console.log('🔧 For now, just testing template generation...\n');
  
  // Just test template generation without sending
  async function testTemplateGeneration() {
    try {
      console.log('🎨 Testing template generation only...\n');
      
      const { generateOrderConfirmationTemplate } = require('../functions/lib/email-orchestrator/templates/orderConfirmation');
      const template = generateOrderConfirmationTemplate({
        orderData: mockOrderData,
        customerInfo: mockCustomerInfo,
        orderId: 'test-order-001',
        orderType: 'B2C'
      }, 'sv-SE');
      
      console.log('✅ Order Confirmation template generated successfully');
      console.log('📧 Subject:', template.subject);
      console.log('📄 HTML length:', template.html.length, 'characters');
      
      console.log('\n💡 To send actual test emails, set GMAIL_APP_PASSWORD environment variable');
      console.log('🔧 Or deploy functions and test via Firebase Functions');
      
    } catch (error) {
      console.error('❌ Template generation failed:', error);
    }
  }
  
  testTemplateGeneration();
} else {
  // Run full test suite with email sending
  runAllTemplateTests().then(() => {
    console.log('\n✅ Template test completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Template test failed:', error);
    process.exit(1);
  });
}
