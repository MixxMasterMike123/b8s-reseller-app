#!/usr/bin/env node

/**
 * B8Shield Manual Order Processing Script
 * Manually processes missing orders from Stripe
 */

const https = require('https');

// Known missing orders from Stripe (based on screenshot)
const MISSING_ORDERS = [
  {
    email: 'ida.larsson91@hotmail.com',
    amount: '228.00 SEK',
    date: '16 sep. 21:44',
    description: 'B8Shield Order - 1 item',
    payment: 'Klarna'
  },
  {
    email: 'mullebulle79@hotmail.com',
    amount: '189.00 SEK', 
    date: '16 sep. 18:41',
    description: 'B8Shield Order - 2 items',
    payment: 'Klarna'
  },
  {
    email: 'hjelpe@live.se',
    amount: '118.00 SEK',
    date: '16 sep. 09:08', 
    description: 'B8Shield Order - 1 item',
    payment: 'Klarna'
  },
  {
    email: 'freja.soleskog@gmail.com',
    amount: '189.00 SEK',
    date: '15 sep. 15:25',
    description: 'B8Shield Order - 2 items',
    payment: 'Stripe (•••• 8356)'
  },
  {
    email: 'gklavmarten@gmail.com',
    amount: '228.00 SEK',
    date: '14 sep. 18:07',
    description: 'B8Shield Order - 1 item', 
    payment: 'Link'
  }
];

function makeHttpsRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON response', raw: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function testOrderProcessingFunction() {
  console.log('🔧 Testing Order Processing Function');
  console.log('===================================');
  
  const functionUrl = 'https://api.b8shield.com/processB2COrderCompletionHttpV2';
  
  // Test with a dummy order ID to see if the function works
  console.log('\n1. Testing function with dummy order ID...');
  try {
    const testResult = await makeHttpsRequest(functionUrl, { orderId: 'test-order-123' });
    console.log('Function response:', testResult);
    
    if (testResult.success === false && testResult.error.includes('not found')) {
      console.log('✅ Function is working (correctly returned "order not found")');
    } else {
      console.log('⚠️ Unexpected function response');
    }
  } catch (error) {
    console.error('❌ Function test failed:', error.message);
  }
  
  console.log('\n2. Attempting to check for orders by email...');
  
  // Check if we can find any of these orders in Firebase
  const debugUrl = 'https://api.b8shield.com/debugOrderData';
  
  for (const missingOrder of MISSING_ORDERS.slice(0, 3)) { // Test first 3
    console.log(`\n🔍 Checking for order: ${missingOrder.email} (${missingOrder.amount})`);
    
    try {
      const searchResult = await makeHttpsRequest(debugUrl, {
        action: 'find_order_by_email',
        email: missingOrder.email
      });
      
      console.log(`   Result:`, searchResult);
      
      if (searchResult.success && searchResult.orders && searchResult.orders.length > 0) {
        console.log(`   ✅ Found ${searchResult.orders.length} orders for ${missingOrder.email}`);
        
        // Try to process each found order
        for (const order of searchResult.orders) {
          console.log(`   🔧 Processing order ${order.id}...`);
          
          const processResult = await makeHttpsRequest(functionUrl, { orderId: order.id });
          console.log(`   Process result:`, processResult);
        }
      } else {
        console.log(`   ❌ No orders found for ${missingOrder.email}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Search failed for ${missingOrder.email}:`, error.message);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the test
console.log('🚨 B8Shield Missing Orders Recovery');
console.log('Missing orders from 13th-16th September 2025');
console.log('==========================================');

testOrderProcessingFunction().then(() => {
  console.log('\n✅ Investigation complete!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Check if orders exist in Firebase but are not visible in admin');
  console.log('2. Create missing Firestore indexes');
  console.log('3. Investigate why Stripe→Firebase order creation might be failing');
  console.log('4. Check if processB2COrderCompletionHttpV2 is being called from checkout');
}).catch(error => {
  console.error('❌ Investigation failed:', error);
});
