const https = require('https');

async function debugLiveOrderData() {
  console.log('🔍 Debugging live order data structure...');
  
  // Use the debugOrderData function we deployed to examine the real order structure
  const options = {
    hostname: 'us-central1-b8shield-reseller-app.cloudfunctions.net',
    port: 443,
    path: '/debugOrderData',
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('🔍 Debug function response status:', res.statusCode);
        console.log('🔍 Debug function response:', data);
        
        try {
          const parsed = JSON.parse(data);
          if (parsed.orderData && parsed.orderData.items) {
            console.log('📦 REAL ORDER ITEMS STRUCTURE:');
            parsed.orderData.items.forEach((item, index) => {
              console.log(`\n--- Item ${index + 1} ---`);
              console.log('ID:', item.id);
              console.log('Name:', item.name);
              console.log('SKU:', item.sku);
              console.log('Color:', item.color, '(type:', typeof item.color, ')');
              console.log('Size:', item.size, '(type:', typeof item.size, ')');
              console.log('Price:', item.price);
              console.log('Quantity:', item.quantity);
              console.log('All fields:', Object.keys(item));
            });
          }
        } catch (error) {
          console.log('Could not parse response as JSON');
        }
        
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error calling debug function:', error);
      reject(error);
    });

    req.end();
  });
}

// Run the debug
debugLiveOrderData().catch(console.error);
