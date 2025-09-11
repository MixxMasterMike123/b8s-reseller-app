#!/usr/bin/env node

/**
 * Test script for Universal Campaign Analytics System
 * Tests the new revenue tracking for KAJJAN and EMMA special campaigns
 */

const https = require('https');

// Test order data - simulating a KAJJAN special edition purchase
const testOrderData = {
  orderId: 'test-kajjan-campaign-' + Date.now(),
  items: [
    {
      id: 'test-kajjan-special',
      name: 'KAJJAN Special Edition 6-pack',
      group: 'B8Shield-special-edition',
      price: 89,
      quantity: 1
    }
  ],
  total: 89,
  shipping: 0,
  discountPercentage: 0,
  affiliateCode: null, // Test without affiliate to verify universal tracking
  customerInfo: {
    email: 'test@kajjan-campaign.com'
  },
  source: 'test'
};

async function testCampaignAnalytics() {
  console.log('🧪 Testing Universal Campaign Analytics System...');
  console.log('📊 Test Scenario: KAJJAN Special Edition purchase without affiliate code');
  console.log('🎯 Expected: Campaign should still receive revenue share\n');

  const postData = JSON.stringify(testOrderData);
  
  const options = {
    hostname: 'us-central1-b8shield-reseller-app.cloudfunctions.net',
    path: '/processB2COrderCompletionHttpV2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Function Response:', response);
          
          if (response.success) {
            console.log('\n🎉 Test Results:');
            console.log('- Order processed successfully');
            console.log('- Universal campaign tracking should have run');
            console.log('- Check Firebase Console for new campaignRevenueTracking records');
            console.log('- KAJJAN campaign should show increased totalRevenue and totalCampaignShare');
          } else {
            console.log('❌ Test failed:', response.error);
          }
          
          resolve(response);
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Revenue calculation explanation
function explainRevenueCalculation() {
  console.log('\n📊 REVENUE CALCULATION EXPLANATION:');
  console.log('='.repeat(50));
  console.log('Product Price: 89 SEK');
  console.log('- Customer Discount (0%): -0 SEK');
  console.log('= After Discount: 89 SEK');
  console.log('- VAT (25%): -17.8 SEK');
  console.log('= After VAT: 71.2 SEK');
  console.log('- Affiliate Commission (0%): -0 SEK');
  console.log('= Campaign Eligible Revenue: 71.2 SEK');
  console.log('→ KAJJAN gets (50%): 35.6 SEK');
  console.log('→ Company keeps (50%): 35.6 SEK');
  console.log('='.repeat(50));
}

// Main execution
async function main() {
  try {
    explainRevenueCalculation();
    await testCampaignAnalytics();
    
    console.log('\n📋 Next Steps:');
    console.log('1. Check Firebase Console → Firestore → campaignRevenueTracking collection');
    console.log('2. Verify KAJJAN campaign stats have been updated');
    console.log('3. Test with affiliate code to verify dual tracking works');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();

