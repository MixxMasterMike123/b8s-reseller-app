// Send real customer confirmation emails for the missing orders
const https = require('https');

// The actual order IDs that need customer emails
const orderIds = [
  'SDQeu1w9M2BDAVHJgKUe',
  'KwHYud92DVIjOfCpoJQ5', 
  'UA73g0wOZzzMupHDJiqX',
  'oCXP39xtk1C0Fl7E9b2f'
];

const sendRealCustomerEmail = async (orderId) => {
  console.log(`📧 Sending REAL customer email for order: ${orderId}`);
  
  // Use the V2 order completion function which will:
  // 1. Fetch the real order data from database
  // 2. Send customer email to the actual customer
  // 3. Also send admin email (but we already got those)
  const postData = JSON.stringify({
    orderId: orderId
  });

  const options = {
    hostname: 'us-central1-b8shield-reseller-app.cloudfunctions.net',
    port: 443,
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
        const response = JSON.parse(data);
        if (res.statusCode === 200 && response.success) {
          console.log(`✅ ${orderId}: Customer email sent to real customer`);
          if (response.commission) {
            console.log(`   💰 Affiliate commission: ${response.commission}`);
          }
        } else {
          console.log(`❌ ${orderId}: Failed - ${data}`);
        }
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${orderId}: Error -`, error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

// Send real customer emails for all missing orders
const sendAllRealCustomerEmails = async () => {
  console.log('🚀 Sending REAL customer confirmation emails to actual customers...\n');
  console.log('📝 Note: These emails will go to the real customers who placed the orders\n');
  
  for (const orderId of orderIds) {
    try {
      await sendRealCustomerEmail(orderId);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    } catch (error) {
      console.error(`Failed to send customer email for ${orderId}:`, error.message);
    }
  }
  
  console.log('\n✅ All real customer emails sent!');
  console.log('📧 The actual customers should now receive their order confirmations');
};

sendAllRealCustomerEmails();
