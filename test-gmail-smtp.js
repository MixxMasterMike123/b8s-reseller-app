const nodemailer = require('nodemailer');

// Gmail SMTP configuration (same as our Firebase Functions)
const createTransporter = () => nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS (STARTTLS) for port 587
  auth: {
    user: 'b8shield.reseller@gmail.com',
    pass: 'ConsoleNeveV3!'
  },
  tls: {
    rejectUnauthorized: false // Allow Gmail's certificate
  }
});

async function testGmailSMTP() {
  console.log('🧪 Testing Gmail SMTP configuration...');
  
  try {
    const transporter = createTransporter();
    
    // Test connection first
    console.log('🔗 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Send test email
    console.log('📧 Sending test email...');
    const mailOptions = {
      from: '"B8Shield Test" <b8shield.reseller@gmail.com>',
      to: 'micke.ohlen@gmail.com',
      subject: '🧪 B8Shield Gmail SMTP Test - ' + new Date().toLocaleString(),
      html: `
        <h2>🎉 Gmail SMTP Test Successful!</h2>
        <p>This email confirms that the B8Shield email system is now working with Gmail SMTP.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>✅ SMTP Host: smtp.gmail.com</li>
          <li>✅ Port: 587 (TLS)</li>
          <li>✅ From: b8shield.reseller@gmail.com</li>
          <li>✅ Test Time: ${new Date().toLocaleString()}</li>
        </ul>
        <p>All B8Shield emails (order confirmations, affiliate credentials, admin notifications) should now work properly!</p>
        <hr>
        <p><em>This is an automated test email from the B8Shield system.</em></p>
      `,
      text: `
🎉 Gmail SMTP Test Successful!

This email confirms that the B8Shield email system is now working with Gmail SMTP.

Test Details:
✅ SMTP Host: smtp.gmail.com
✅ Port: 587 (TLS)  
✅ From: b8shield.reseller@gmail.com
✅ Test Time: ${new Date().toLocaleString()}

All B8Shield emails (order confirmations, affiliate credentials, admin notifications) should now work properly!

This is an automated test email from the B8Shield system.
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📨 Message ID:', result.messageId);
    console.log('📬 Check your inbox: micke.ohlen@gmail.com');
    
  } catch (error) {
    console.error('❌ Gmail SMTP Test Failed:');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.response) {
      console.error('Server Response:', error.response);
    }
  }
}

// Run the test
testGmailSMTP();
