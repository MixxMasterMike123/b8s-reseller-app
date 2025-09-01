const nodemailer = require('nodemailer');

// Test different One.com SMTP configurations locally
async function testOneDotComSMTP() {
  console.log('🧪 Testing One.com SMTP configurations locally...');
  
  const configs = [
    {
      name: 'Config 1: Port 587 with STARTTLS (recommended)',
      config: {
        host: 'send.one.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
          user: 'info@jphinnovation.se',
          pass: 'cuteSe@l54'
        }
      }
    },
    {
      name: 'Config 2: Port 587 with TLS 1.2+ forced',
      config: {
        host: 'send.one.com',
        port: 587,
        secure: false,
        auth: {
          user: 'info@jphinnovation.se',
          pass: 'cuteSe@l54'
        },
        tls: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true
        }
      }
    },
    {
      name: 'Config 3: Port 465 with SSL',
      config: {
        host: 'send.one.com',
        port: 465,
        secure: true, // SSL
        auth: {
          user: 'info@jphinnovation.se',
          pass: 'cuteSe@l54'
        }
      }
    },
    {
      name: 'Config 4: Port 465 with SSL and TLS 1.2+',
      config: {
        host: 'send.one.com',
        port: 465,
        secure: true,
        auth: {
          user: 'info@jphinnovation.se',
          pass: 'cuteSe@l54'
        },
        tls: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true
        }
      }
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const { name, config } = configs[i];
    console.log(`\n🔧 Testing ${name}...`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Test connection
      console.log('   🔗 Testing connection...');
      await transporter.verify();
      console.log('   ✅ Connection successful!');
      
      // Try to send test email
      console.log('   📧 Sending test email...');
      const result = await transporter.sendMail({
        from: 'info@jphinnovation.se',
        to: 'micke.ohlen@gmail.com',
        subject: `🧪 One.com SMTP Test - ${name}`,
        text: `Test email sent at ${new Date().toISOString()}`,
        html: `<p>Test email sent at ${new Date().toISOString()}</p><p>Configuration: ${name}</p>`
      });
      
      console.log(`   ✅ Email sent successfully! Message ID: ${result.messageId}`);
      console.log(`   🎉 WORKING CONFIGURATION FOUND: ${name}`);
      break; // Stop at first working config
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      console.log(`   📋 Error code: ${error.code || 'Unknown'}`);
    }
  }
}

testOneDotComSMTP().catch(console.error);

