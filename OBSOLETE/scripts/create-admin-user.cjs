// Simple script to create admin user via Firebase Functions
const https = require('https');

async function createAdminUser() {
  try {
    console.log('Creating admin user in default database...');
    
    // Use the createTestData function but modify it to create admin user
    const url = 'https://us-central1-b8shield-reseller-app.cloudfunctions.net/createAdminUser';
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response:', data);
      });
    });
    
    req.on('error', (error) => {
      console.error('Error:', error);
    });
    
    req.end();
    
  } catch (error) {
    console.error('Failed to create admin user:', error);
  }
}

createAdminUser(); 