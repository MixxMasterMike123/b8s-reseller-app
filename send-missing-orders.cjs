// Send emails for the 2 orders that were missed
const https = require('https');

// The 2 orders that still need emails
const missingOrderIds = [
  'jHsZjuzdhOh2vmTa9MZV',
  'vJ2CEjlwfRiuMDt7H2tu'
];

const sendEmailsForOrder = async (orderId) => {
  console.log(`📧 Sending BOTH admin and customer emails for order: ${orderId}`);
  
  // Use the V2 order completion function which will:
  // 1. Fetch the real order data from database
  // 2. Send customer email to the actual customer
  // 3. Send admin emails to both admin addresses
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
          console.log(`✅ ${orderId}: BOTH admin and customer emails sent`);
          if (response.commission) {
            console.log(`   💰 Affiliate commission: ${response.commission}`);
          } else {
            console.log(`   📝 No affiliate commission (direct order)`);
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

// Send emails for the missing orders
const sendMissingOrderEmails = async () => {
  console.log('🚀 Sending emails for the 2 missing orders...\n');
  console.log('📧 This will send BOTH admin and customer emails for each order\n');
  
  for (const orderId of missingOrderIds) {
    try {
      await sendEmailsForOrder(orderId);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    } catch (error) {
      console.error(`Failed to send emails for ${orderId}:`, error.message);
    }
  }
  
  console.log('\n✅ All missing order emails sent!');
  console.log('📧 Both admin and customers should now receive emails for these orders');
};

sendMissingOrderEmails();
