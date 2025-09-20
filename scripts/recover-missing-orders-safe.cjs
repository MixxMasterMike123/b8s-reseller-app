#!/usr/bin/env node

/**
 * B8Shield Safe Order Recovery Script
 * Safely recreates missing orders from Stripe data without disrupting existing flows
 */

const https = require('https');

// Missing orders from Stripe with complete data
const MISSING_ORDERS = [
  {
    // Order #1: Nathalie Branell (7th Sept)
    stripeChargeId: "py_3S4cXAPjLuTcPrBL1xh0L6oL",
    stripePaymentIntentId: "pi_3S4cXAPjLuTcPrBL1hJMg8FP",
    amount: 269.00,
    email: "nathalie.branell@gmail.com",
    name: "Nathalie Branell",
    date: "2025-09-07",
    timestamp: 1757228336,
    payment: "klarna",
    cartSummary: "1xB8S-4-tr,1xB8S-le-pi,1xB8S-le-gr",
    itemIds: "1Kk2j14y,FNZndUqp,ZAELMIDu",
    itemCount: 3,
    totalItems: 3,
    shippingCost: 29,
    shippingCountry: "SE",
    affiliateCode: "KAJJAN10",
    affiliateClickId: "HWcxbUcPcJcDL8zqfTMX",
    discountCode: "KAJJAN10",
    discountPercentage: 10,
    discountAmount: 27
  },
  {
    // Order #2: Malin Nilsson (5th Sept)
    stripeChargeId: "py_3S3rwFPjLuTcPrBL1oBSJQUT",
    stripePaymentIntentId: "pi_3S3rwFPjLuTcPrBL1oSR5FBk",
    amount: 109.00,
    email: "m.nilsson74@gmail.com",
    name: "Malin Nilsson",
    date: "2025-09-05",
    timestamp: 1757049171,
    payment: "klarna",
    cartSummary: "1xB8S-le-pi",
    itemIds: "FNZndUqp",
    itemCount: 1,
    totalItems: 1,
    shippingCost: 29,
    shippingCountry: "SE",
    affiliateCode: "EMMA10",
    affiliateClickId: "LN77ifAR4dbPFICxHCEj",
    discountCode: "EMMA10",
    discountPercentage: 10,
    discountAmount: 9
  },
  {
    // Order #3: Bertil Håkansson (6th Sept)
    stripeChargeId: "py_3S451zPjLuTcPrBL0psKYd4T",
    stripePaymentIntentId: "pi_3S451zPjLuTcPrBL0HbtN59k",
    amount: 189.00,
    email: "lidenbonden@telia.com",
    name: "Bertil Håkansson",
    date: "2025-09-06",
    timestamp: 1757099559,
    payment: "klarna",
    cartSummary: "2xB8S-le-pi",
    itemIds: "FNZndUqp",
    itemCount: 1,
    totalItems: 2,
    shippingCost: 29,
    shippingCountry: "SE",
    affiliateCode: "EMMA10",
    affiliateClickId: "k5FKxAHVpQjBoxUWIwV5",
    discountCode: "EMMA10",
    discountPercentage: 10,
    discountAmount: 18
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

function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `B8S-${timestamp.slice(-6)}-${random}`;
}

async function recoverMissingOrders() {
  console.log('🔧 B8Shield Safe Order Recovery');
  console.log('===============================');
  console.log('Creating missing orders from Stripe data...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  // First, let's generate the email template and order data
  console.log('📧 CUSTOMER EMAIL DATA:');
  console.log('=======================\n');
  
  for (let i = 0; i < MISSING_ORDERS.length; i++) {
    const order = MISSING_ORDERS[i];
    const orderNumber = generateOrderNumber();
    
    console.log(`${i + 1}. ${order.name} <${order.email}>`);
    console.log(`   Order Number: ${orderNumber}`);
    console.log(`   Amount: ${order.amount} SEK`);
    console.log(`   Date: ${order.date}`);
    console.log(`   Products: ${order.cartSummary}`);
    console.log(`   Affiliate: ${order.affiliateCode || 'None'} ${order.affiliateCode ? `(-${order.discountPercentage}%)` : ''}`);
    console.log(`   Stripe Payment ID: ${order.stripePaymentIntentId}`);
    console.log('   ---');
  }
  
  console.log('\n📧 EMAIL TEMPLATE FOR ALL CUSTOMERS:');
  console.log('====================================');
  console.log(`
Subject: B8Shield Order Confirmation - Leveransadress behövs

Hej [Namn],

Vi upptäckte ett tekniskt problem som försenade din orderbekräftelse. 
Din betalning genomfördes framgångsrikt via Klarna och din order behandlas nu.

Orderdetaljer:
- Ordernummer: [Se ovan för respektive kund]
- Belopp: [Se belopp ovan] SEK
- Produkter: [Se produkter ovan]
- Rabattkod: [Se affiliate ovan om tillämpligt]

För att slutföra leveransen behöver vi din fullständiga leveransadress:

Leveransadress:
- Fullständigt namn:
- Adress:
- Postnummer:
- Stad:
- Telefonnummer (för leverans):

Svara på detta mail med din adress så skickar vi dina produkter omgående.

Vi ber om ursäkt för besväret och uppskattar ditt tålamod!

Vänliga hälsningar,
B8Shield Team

---
Order bekräftelse kommer skickas när vi mottagit din adress.
  `);
  
  console.log('\n🎯 RECOVERY SUMMARY:');
  console.log('===================');
  console.log(`📧 Customers to contact: ${MISSING_ORDERS.length}`);
  console.log(`💰 Total amount to recover: ${MISSING_ORDERS.reduce((sum, order) => sum + order.amount, 0)} SEK`);
  console.log(`🎯 Affiliate commissions to process:`);
  
  const affiliateCommissions = {};
  MISSING_ORDERS.forEach(order => {
    if (order.affiliateCode) {
      if (!affiliateCommissions[order.affiliateCode]) {
        affiliateCommissions[order.affiliateCode] = { orders: 0, commission: 0 };
      }
      affiliateCommissions[order.affiliateCode].orders++;
      affiliateCommissions[order.affiliateCode].commission += order.discountAmount;
    }
  });
  
  Object.entries(affiliateCommissions).forEach(([code, data]) => {
    console.log(`   - ${code}: ${data.orders} orders, ~${data.commission} SEK commission`);
  });
  
  return { 
    success: 0, 
    skipped: 0, 
    failed: 0, 
    emailsToSend: MISSING_ORDERS.length,
    totalAmount: MISSING_ORDERS.reduce((sum, order) => sum + order.amount, 0)
  };
}

// Helper function to parse cart items from Stripe metadata
function parseCartItems(order) {
  const items = [];
  const skus = order.cartSummary.split(',');
  const ids = order.itemIds.split(',');
  
  skus.forEach((sku, index) => {
    const match = sku.match(/(\d+)x(.+)/);
    if (match) {
      const quantity = parseInt(match[1]);
      const productSku = match[2];
      
      items.push({
        id: ids[index] || `item_${index}`,
        sku: productSku,
        quantity: quantity,
        // Price will be calculated based on total and quantities
        price: Math.round((order.amount - order.shippingCost - (order.discountAmount || 0)) / order.totalItems * 100) / 100
      });
    }
  });
  
  return items;
}

// Run the recovery
console.log('🚨 Starting safe order recovery process...\n');

recoverMissingOrders().then((results) => {
  console.log('\n✅ Email data generation completed!');
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Send personalized emails to customers requesting shipping addresses');
  console.log('2. Once addresses are received, manually create orders in Firebase');
  console.log('3. Process affiliate commissions for KAJJAN10 and EMMA10');
  console.log('4. Send proper order confirmations');
  console.log('5. Implement webhook system to prevent future order losses');
  
}).catch(error => {
  console.error('❌ Email data generation failed:', error);
});
