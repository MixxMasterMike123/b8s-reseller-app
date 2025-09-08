#!/usr/bin/env node

/**
 * Test Email System via Firebase Functions HTTP Endpoints
 * Tests the fixed email orchestrator by calling the deployed functions
 */

const https = require('https');

// Firebase project configuration
const PROJECT_ID = 'b8shield-reseller-app';
const REGION = 'us-central1';

// Test order data
const TEST_ORDER_ID = 'oOcssJqC22VPDtoNlbH6';
const TEST_ORDER_NUMBER = 'B8S-844327-JUGU';
const TEST_EMAIL = 'micke@sidelake.com';

async function callFirebaseFunction(functionName, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: `${REGION}-${PROJECT_ID}.cloudfunctions.net`,
      port: 443,
      path: `/${functionName}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: result });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function testOrderStatusUpdate() {
  console.log('🧪 Testing Order Status Update Email...');
  console.log(`📧 Order: ${TEST_ORDER_NUMBER} (${TEST_ORDER_ID})`);
  console.log(`👤 Customer: ${TEST_EMAIL}`);
  
  const testData = {
    data: {
      orderNumber: TEST_ORDER_NUMBER,
      newStatus: 'shipped',
      previousStatus: 'processing',
      userEmail: TEST_EMAIL,
      userId: null,
      b2cCustomerId: null
    }
  };

  try {
    const result = await callFirebaseFunction('sendOrderStatusUpdateEmail', testData);
    console.log(`📊 Status Code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      console.log('✅ Order status update email function called successfully!');
      console.log('📧 Check your email for the status update notification');
    } else {
      console.log('❌ Function call failed:', result.data);
    }
  } catch (error) {
    console.error('❌ Error calling function:', error.message);
  }
}

async function testPasswordReset() {
  console.log('\n🧪 Testing Password Reset Email...');
  
  const testData = {
    data: {
      email: TEST_EMAIL
    }
  };

  try {
    const result = await callFirebaseFunction('sendPasswordResetEmail', testData);
    console.log(`📊 Status Code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      console.log('✅ Password reset email function called successfully!');
      console.log('📧 Check your email for the password reset link');
    } else {
      console.log('❌ Function call failed:', result.data);
    }
  } catch (error) {
    console.error('❌ Error calling function:', error.message);
  }
}

async function testEmailOrchestrator() {
  console.log('\n🧪 Testing Email Orchestrator...');
  
  const testData = {
    data: {
      testType: 'all',
      recipient: TEST_EMAIL
    }
  };

  try {
    const result = await callFirebaseFunction('testEmailOrchestrator', testData);
    console.log(`📊 Status Code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      console.log('✅ Email orchestrator test called successfully!');
      console.log('📧 Check your email for test messages');
    } else {
      console.log('❌ Function call failed:', result.data);
    }
  } catch (error) {
    console.error('❌ Error calling function:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Email System Tests...');
  console.log(`🔧 Project: ${PROJECT_ID}`);
  console.log(`🌍 Region: ${REGION}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 1: Order Status Update (most common email)
  await testOrderStatusUpdate();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Password Reset
  await testPasswordReset();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Email Orchestrator
  await testEmailOrchestrator();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All email tests completed!');
  console.log(`📧 Check ${TEST_EMAIL} for test emails`);
  console.log('📧 Check info@jphinnovation.se and micke.ohlen@gmail.com for admin notifications');
}

// Run the tests
runAllTests().catch(console.error);
