#!/usr/bin/env node

/**
 * B8Shield September 2025 Missing Orders Audit
 * Compares Stripe charges with Firebase orders to find missing orders
 */

const https = require('https');

// Known Stripe charges from September (based on your screenshots)
const STRIPE_CHARGES_SEPTEMBER = [
  // September 16th
  {
    date: '2025-09-16',
    email: 'ida.larsson91@hotmail.com',
    amount: '228.00 SEK',
    time: '21:44',
    description: 'B8Shield Order - 1 item',
    payment: 'Klarna',
    status: 'Lyckades ✓'
  },
  {
    date: '2025-09-16', 
    email: 'mullebulle79@hotmail.com',
    amount: '189.00 SEK',
    time: '18:41',
    description: 'B8Shield Order - 2 items',
    payment: 'Klarna',
    status: 'Lyckades ✓'
  },
  {
    date: '2025-09-16',
    email: 'hjelpe@live.se',
    amount: '118.00 SEK', 
    time: '09:08',
    description: 'B8Shield Order - 1 item',
    payment: 'Klarna',
    status: 'Lyckades ✓'
  },
  
  // September 15th
  {
    date: '2025-09-15',
    email: 'freja.soleskog@gmail.com',
    amount: '189.00 SEK',
    time: '15:25', 
    description: 'B8Shield Order - 2 items',
    payment: 'Stripe (•••• 8356)',
    status: 'Lyckades ✓'
  },
  
  // September 14th
  {
    date: '2025-09-14',
    email: 'gklavmarten@gmail.com',
    amount: '228.00 SEK',
    time: '18:07',
    description: 'B8Shield Order - 1 item',
    payment: 'Link',
    status: 'Lyckades ✓'
  },
  
  // September 13th  
  {
    date: '2025-09-13',
    email: 'anderschow1976@gmail.com',
    amount: '228.00 SEK',
    time: '21:54',
    description: 'B8Shield Order - 1 item', 
    payment: 'Klarna',
    status: 'Lyckades ✓'
  },
  {
    date: '2025-09-13',
    email: 'hakan_k@live.se',
    amount: '118.00 SEK',
    time: '18:23',
    description: 'B8Shield Order - 1 item',
    payment: 'Link', 
    status: 'Lyckades ✓'
  },
  {
    date: '2025-09-13',
    email: 'ninaandersson_70@hotmail.com',
    amount: '109.00 SEK',
    time: '07:31',
    description: 'B8Shield Order - 1 item',
    payment: 'Klarna',
    status: 'Lyckades ✓'
  },
  {
    date: '2025-09-13',
    email: 'ninaandersson_70@hotmail.com', 
    amount: '109.00 SEK',
    time: '07:24',
    description: 'B8Shield Order - 1 item',
    payment: 'Klarna',
    status: 'Har löpt ut ⏰'
  },
  {
    date: '2025-09-13',
    email: 'laszlo6959@gmail.com',
    amount: '228.00 SEK',
    time: '01:11', 
    description: 'B8Shield Order - 1 item',
    payment: 'Klarna',
    status: 'Lyckades ✓'
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

async function auditMissingOrders() {
  console.log('🔍 B8Shield September 2025 Missing Orders Audit');
  console.log('===============================================');
  console.log(`Checking ${STRIPE_CHARGES_SEPTEMBER.length} known Stripe charges...`);
  
  const debugUrl = 'https://us-central1-b8shield-reseller-app.cloudfunctions.net/debugOrderData';
  
  let missingOrders = [];
  let foundOrders = [];
  let failedChecks = [];
  
  for (let i = 0; i < STRIPE_CHARGES_SEPTEMBER.length; i++) {
    const charge = STRIPE_CHARGES_SEPTEMBER[i];
    
    console.log(`\n[${i + 1}/${STRIPE_CHARGES_SEPTEMBER.length}] Checking: ${charge.email} (${charge.amount}) - ${charge.date} ${charge.time}`);
    
    try {
      // Try to find order by email (without date filter to avoid index issues)
      const searchResult = await makeHttpsRequest(debugUrl, {
        action: 'find_order_by_email_simple',
        email: charge.email
      });
      
      if (searchResult.success && searchResult.orders && searchResult.orders.length > 0) {
        console.log(`   ✅ FOUND: ${searchResult.orders.length} order(s) in Firebase`);
        
        // Check if any order matches the amount/date
        let matchFound = false;
        for (const order of searchResult.orders) {
          const orderAmount = parseFloat(charge.amount.replace(' SEK', ''));
          if (Math.abs(order.total - orderAmount) < 0.01) {
            console.log(`   ✅ AMOUNT MATCH: Order ${order.id} (${order.total} SEK)`);
            matchFound = true;
            break;
          }
        }
        
        if (matchFound) {
          foundOrders.push({
            ...charge,
            status: 'FOUND_IN_FIREBASE'
          });
        } else {
          console.log(`   ⚠️  AMOUNT MISMATCH: No order with ${charge.amount}`);
          missingOrders.push({
            ...charge,
            status: 'AMOUNT_MISMATCH'
          });
        }
        
      } else if (searchResult.success && (!searchResult.orders || searchResult.orders.length === 0)) {
        console.log(`   ❌ MISSING: No orders found for ${charge.email}`);
        missingOrders.push({
          ...charge,
          status: 'MISSING_FROM_FIREBASE'
        });
      } else {
        console.log(`   ⚠️  ERROR: ${searchResult.error || 'Unknown error'}`);
        failedChecks.push({
          ...charge,
          status: 'CHECK_FAILED',
          error: searchResult.error
        });
      }
      
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      failedChecks.push({
        ...charge,
        status: 'CHECK_FAILED', 
        error: error.message
      });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary Report
  console.log('\n📊 AUDIT SUMMARY');
  console.log('================');
  console.log(`Total Stripe charges checked: ${STRIPE_CHARGES_SEPTEMBER.length}`);
  console.log(`✅ Found in Firebase: ${foundOrders.length}`);
  console.log(`❌ Missing from Firebase: ${missingOrders.length}`);
  console.log(`⚠️  Failed to check: ${failedChecks.length}`);
  
  if (missingOrders.length > 0) {
    console.log('\n🚨 MISSING ORDERS DETAILS:');
    console.log('==========================');
    missingOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.email}`);
      console.log(`   Amount: ${order.amount}`);
      console.log(`   Date: ${order.date} ${order.time}`);
      console.log(`   Payment: ${order.payment}`);
      console.log(`   Status: ${order.status}`);
      console.log('');
    });
  }
  
  if (failedChecks.length > 0) {
    console.log('\n⚠️  FAILED CHECKS (Need Manual Review):');
    console.log('=====================================');
    failedChecks.forEach((order, index) => {
      console.log(`${index + 1}. ${order.email} - ${order.error}`);
    });
  }
  
  // Generate recovery data
  if (missingOrders.length > 0) {
    console.log('\n📋 RECOVERY SCRIPT DATA:');
    console.log('========================');
    console.log('Copy this data for recovery script:');
    console.log(JSON.stringify(missingOrders, null, 2));
  }
  
  return {
    total: STRIPE_CHARGES_SEPTEMBER.length,
    found: foundOrders.length,
    missing: missingOrders.length,
    failed: failedChecks.length,
    missingOrders: missingOrders
  };
}

// Run the audit
console.log('Starting September 2025 missing orders audit...\n');

auditMissingOrders().then((results) => {
  console.log('\n✅ Audit completed!');
  console.log(`\n📈 RESULTS: ${results.found}/${results.total} orders found in Firebase`);
  
  if (results.missing > 0) {
    console.log(`\n🔧 NEXT STEPS:`);
    console.log('1. Create recovery script using the missing orders data above');
    console.log('2. Manually recreate missing orders in Firebase');
    console.log('3. Send delayed confirmation emails to affected customers');
    console.log('4. Process any missing affiliate commissions');
  }
  
}).catch(error => {
  console.error('❌ Audit failed:', error);
});
