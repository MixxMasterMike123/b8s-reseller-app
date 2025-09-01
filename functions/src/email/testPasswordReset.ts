import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

// Gmail SMTP configuration - completely isolated
const gmailHost = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const gmailPort = defineString('SMTP_PORT', { default: '587' });
const gmailUser = defineString('SMTP_USER', { default: 'b8shield.reseller@gmail.com' });
const gmailPass = defineString('SMTP_PASS');

// Minimal test password reset function
export const testPasswordResetMinimal = onCall(async (request) => {
  console.log('🧪 TEST FUNCTION STARTED - Minimal password reset test');
  
  const { email } = request.data;
  
  if (!email) {
    console.log('❌ No email provided');
    throw new HttpsError('invalid-argument', 'Email is required');
  }
  
  console.log(`🧪 Testing password reset for: ${email}`);
  
  try {
    // Show what SMTP config we're actually using
    console.log(`🔧 TEST SMTP Config - Host: ${gmailHost.value()}, Port: ${gmailPort.value()}, User: ${gmailUser.value()}`);
    
    // Create Gmail transporter directly
    const transporter = nodemailer.createTransport({
      host: gmailHost.value(),
      port: parseInt(gmailPort.value()),
      secure: false, // TLS
      auth: {
        user: gmailUser.value(),
        pass: gmailPass.value()
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('🔧 Gmail transporter created');
    
    // Test connection first
    console.log('🔗 Testing Gmail SMTP connection...');
    await transporter.verify();
    console.log('✅ Gmail SMTP connection verified!');
    
    // Send simple test email
    const resetCode = 'TEST-' + Math.random().toString(36).substring(2, 8);
    
    const mailOptions = {
      from: `"B8Shield Test" <${gmailUser.value()}>`,
      to: email,
      subject: '🧪 B8Shield Password Reset Test',
      html: `
        <h2>🧪 Password Reset Test</h2>
        <p>This is a test email to verify Gmail SMTP is working.</p>
        <p><strong>Reset Code:</strong> ${resetCode}</p>
        <p>If you received this, Gmail SMTP is working correctly!</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      text: `Password Reset Test - Reset Code: ${resetCode} - Time: ${new Date().toISOString()}`
    };
    
    console.log('📧 Sending test email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!', result.messageId);
    
    return {
      success: true,
      message: 'Test password reset email sent successfully',
      messageId: result.messageId,
      resetCode: resetCode,
      smtpConfig: {
        host: gmailHost.value(),
        port: gmailPort.value(),
        user: gmailUser.value()
      }
    };
    
  } catch (error) {
    console.error('❌ Test function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Test failed: ${errorMessage}`);
  }
});
