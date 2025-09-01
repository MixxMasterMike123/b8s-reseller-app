import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailService } from './EmailService';
import { getPasswordResetTemplate } from './templates/passwordReset';

// Initialize Firestore with named database
const db = getFirestore('b8s-reseller-db');

// Helper function for email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// New, clean password reset function
export const sendPasswordResetV3 = onCall(async (request) => {
  console.log('🚀 sendPasswordResetV3: Starting clean email system...');
  
  const { email } = request.data;
  
  if (!email || !isValidEmail(email)) {
    console.log('❌ Invalid email provided');
    throw new HttpsError('invalid-argument', 'Valid email is required');
  }

  try {
    console.log(`🔍 Processing password reset for: ${email}`);

    // Generate secure reset code
    const resetCode = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const timestamp = new Date().toLocaleString('sv-SE');
    const userAgent = request.rawRequest?.headers?.['user-agent'] || 'Unknown device';

    // Try to find user's preferred language
    let preferredLang = 'sv-SE';
    
    // Check affiliates collection
    try {
      const affiliatesSnapshot = await db.collection('affiliates')
        .where('email', '==', email).get();
      if (!affiliatesSnapshot.empty) {
        const affiliateData = affiliatesSnapshot.docs[0].data();
        preferredLang = affiliateData.preferredLang || 'sv-SE';
        console.log(`Found affiliate with preferred language: ${preferredLang}`);
      }
    } catch (error) {
      console.log('No affiliate found, checking B2C customers...');
    }

    // Check B2C customers collection
    try {
      const b2cSnapshot = await db.collection('b2cCustomers')
        .where('email', '==', email).get();
      if (!b2cSnapshot.empty) {
        const customerData = b2cSnapshot.docs[0].data();
        preferredLang = customerData.preferredLang || 'sv-SE';
        console.log(`Found B2C customer with preferred language: ${preferredLang}`);
      }
    } catch (error) {
      console.log('No B2C customer found, using default language');
    }

    // Store reset code in Firestore
    await db.collection('passwordResets').add({
      email,
      resetCode,
      expiresAt,
      used: false,
      createdAt: new Date(),
      userAgent
    });

    // Get email template
    const template = getPasswordResetTemplate({
      email,
      resetCode,
      userAgent,
      timestamp
    }, preferredLang);

    // Send email using new EmailService
    const emailService = EmailService.getInstance();
    
    // Verify connection first
    const connectionOk = await emailService.verifyConnection();
    if (!connectionOk) {
      throw new Error('SMTP connection failed');
    }

    // Send the email
    const messageId = await emailService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Password reset email sent successfully to ${email}`);

    return {
      success: true,
      email,
      language: preferredLang,
      messageId,
      expiresAt: expiresAt.toISOString()
    };

  } catch (error) {
    console.error('❌ Password reset failed:', error);
    throw new HttpsError('internal', 'Failed to send password reset email');
  }
});

