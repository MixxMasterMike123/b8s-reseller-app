// Main V3 email functions
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
// import { getAuth } from 'firebase-admin/auth'; // TODO: Will be needed for future functions
import { EmailService } from './EmailService';
import { getWelcomeCredentialsTemplate, WelcomeCredentialsData } from './templates/welcomeCredentials';
import { getAffiliateWelcomeTemplate, AffiliateWelcomeData } from './templates/affiliateWelcome';
import { getB2COrderPendingTemplate, B2COrderPendingData } from './templates/b2cOrderPending';
import { getAdminB2COrderNotificationTemplate, AdminB2COrderNotificationData } from './templates/adminB2COrderNotification';
import { getB2BOrderConfirmationCustomerTemplate, B2BOrderConfirmationCustomerData } from './templates/b2bOrderConfirmationCustomer';
import { getOrderStatusUpdateTemplate, OrderStatusUpdateData } from './templates/orderStatusUpdate';
import { getB2BOrderConfirmationAdminTemplate, B2BOrderConfirmationAdminData } from './templates/b2bOrderConfirmationAdmin';

// Initialize Firestore with named database and Auth
const db = getFirestore('b8s-reseller-db');
// const auth = getAuth(); // TODO: Will be needed for future functions

// Helper function for email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function for admin authentication
async function verifyAdminAuth(authUid?: string): Promise<void> {
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminDoc = await db.collection('users').doc(authUid).get();
  if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
}

// Helper function to determine user's preferred language
async function getUserPreferredLanguage(email: string): Promise<string> {
  let preferredLang = 'sv-SE';
  
  // Check affiliates collection
  try {
    const affiliatesSnapshot = await db.collection('affiliates')
      .where('email', '==', email).get();
    if (!affiliatesSnapshot.empty) {
      const affiliateData = affiliatesSnapshot.docs[0].data();
      preferredLang = affiliateData.preferredLang || 'sv-SE';
      console.log(`Found affiliate with preferred language: ${preferredLang}`);
      return preferredLang;
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
      return preferredLang;
    }
  } catch (error) {
    console.log('No B2C customer found, using default language');
  }

  return preferredLang;
}

// Helper function to send email using V3 system
async function sendEmailV3(to: string, subject: string, html: string): Promise<string> {
  const emailService = EmailService.getInstance();
  
  // Verify connection first
  const connectionOk = await emailService.verifyConnection();
  if (!connectionOk) {
    throw new Error('SMTP connection failed');
  }

  // Send the email
  const messageId = await emailService.sendEmail({
    to,
    subject,
    html
  });

  return messageId;
}

// V3 Customer Welcome Email Function
export const sendCustomerWelcomeEmailV3 = onCall(async (request) => {
  console.log('🚀 sendCustomerWelcomeEmailV3: Starting...');
  
  const { auth: userAuth, data } = request;
  
  // Verify admin authentication
  await verifyAdminAuth(userAuth?.uid);
  
  const { customerData, temporaryPassword } = data as {
    customerData: WelcomeCredentialsData['customerData'];
    temporaryPassword: string;
  };
  
  if (!customerData?.email || !isValidEmail(customerData.email)) {
    throw new HttpsError('invalid-argument', 'Valid customer email is required');
  }
  
  if (!temporaryPassword) {
    throw new HttpsError('invalid-argument', 'Temporary password is required');
  }

  try {
    console.log(`🔍 Processing welcome email for: ${customerData.email}`);

    // Get user's preferred language
    const preferredLang = await getUserPreferredLanguage(customerData.email);

    // Get email template
    const template = getWelcomeCredentialsTemplate({
      customerData,
      temporaryPassword
    }, preferredLang);

    // Send the email
    const messageId = await sendEmailV3(customerData.email, template.subject, template.html);

    console.log(`✅ Welcome email sent successfully to ${customerData.email}`);

    return {
      success: true,
      email: customerData.email,
      language: preferredLang,
      messageId
    };

  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    throw new HttpsError('internal', 'Failed to send welcome email');
  }
});

// V3 Affiliate Welcome Email Function
export const sendAffiliateWelcomeEmailV3 = onCall(async (request) => {
  console.log('🚀 sendAffiliateWelcomeEmailV3: Starting...');
  
  const { auth: userAuth, data } = request;
  
  // Verify admin authentication
  await verifyAdminAuth(userAuth?.uid);
  
  const { appData, affiliateCode, tempPassword, loginInstructions, wasExistingAuthUser } = data as AffiliateWelcomeData;
  
  if (!appData?.email || !isValidEmail(appData.email)) {
    throw new HttpsError('invalid-argument', 'Valid affiliate email is required');
  }
  
  if (!affiliateCode) {
    throw new HttpsError('invalid-argument', 'Affiliate code is required');
  }

  try {
    console.log(`🔍 Processing affiliate welcome email for: ${appData.email}`);

    // Get user's preferred language
    const preferredLang = await getUserPreferredLanguage(appData.email);

    // Get email template
    const template = getAffiliateWelcomeTemplate({
      appData,
      affiliateCode,
      tempPassword,
      loginInstructions,
      wasExistingAuthUser
    }, preferredLang);

    // Send the email
    const messageId = await sendEmailV3(appData.email, template.subject, template.html);

    console.log(`✅ Affiliate welcome email sent successfully to ${appData.email}`);

    return {
      success: true,
      email: appData.email,
      language: preferredLang,
      messageId
    };

  } catch (error) {
    console.error('❌ Affiliate welcome email failed:', error);
    throw new HttpsError('internal', 'Failed to send affiliate welcome email');
  }
});

// V3 B2C Order Pending Email Function
export const sendB2COrderPendingEmailV3 = onCall(async (request) => {
  console.log('🚀 sendB2COrderPendingEmailV3: Starting...');
  
  const { data } = request;
  
  const { orderData, customerInfo, orderId } = data as B2COrderPendingData;
  
  if (!customerInfo?.email || !isValidEmail(customerInfo.email)) {
    throw new HttpsError('invalid-argument', 'Valid customer email is required');
  }
  
  if (!orderData?.orderNumber) {
    throw new HttpsError('invalid-argument', 'Order data is required');
  }

  try {
    console.log(`🔍 Processing B2C order confirmation for: ${customerInfo.email}`);

    // Get user's preferred language
    const preferredLang = await getUserPreferredLanguage(customerInfo.email);

    // Get email template
    const template = getB2COrderPendingTemplate({
      orderData,
      customerInfo,
      orderId
    }, preferredLang);

    // Send the email
    const messageId = await sendEmailV3(customerInfo.email, template.subject, template.html);

    console.log(`✅ B2C order confirmation sent successfully to ${customerInfo.email}`);

    return {
      success: true,
      email: customerInfo.email,
      orderNumber: orderData.orderNumber,
      language: preferredLang,
      messageId
    };

  } catch (error) {
    console.error('❌ B2C order confirmation failed:', error);
    throw new HttpsError('internal', 'Failed to send order confirmation');
  }
});

// V3 Admin B2C Order Notification Function
export const sendB2COrderNotificationAdminV3 = onCall(async (request) => {
  console.log('🚀 sendB2COrderNotificationAdminV3: Starting...');
  
  const { data } = request;
  
  const { orderData } = data as AdminB2COrderNotificationData;
  
  if (!orderData?.orderNumber) {
    throw new HttpsError('invalid-argument', 'Order data is required');
  }

  try {
    console.log(`🔍 Processing admin B2C notification for order: ${orderData.orderNumber}`);

    // Admin emails are always in Swedish
    const preferredLang = 'sv-SE';

    // Get email template
    const template = getAdminB2COrderNotificationTemplate({
      orderData
    }, preferredLang);

    // Send to all admin emails (hardcoded for now, could be made configurable)
    const adminEmails = ['micke.ohlen@gmail.com']; // TODO: Make this configurable
    
    const emailPromises = adminEmails.map(email => 
      sendEmailV3(email, template.subject, template.html)
    );

    const messageIds = await Promise.all(emailPromises);

    console.log(`✅ Admin B2C notification sent successfully for order: ${orderData.orderNumber}`);

    return {
      success: true,
      orderNumber: orderData.orderNumber,
      language: preferredLang,
      messageIds
    };

  } catch (error) {
    console.error('❌ Admin B2C notification failed:', error);
    throw new HttpsError('internal', 'Failed to send admin notification');
  }
});

// V3 B2B Order Confirmation Customer Function
export const sendB2BOrderConfirmationCustomerV3 = onCall(async (request) => {
  console.log('🚀 sendB2BOrderConfirmationCustomerV3: Starting...');
  
  const { data } = request;
  
  const { userData, orderData, orderSummary, totalAmount } = data as B2BOrderConfirmationCustomerData;
  
  if (!userData?.email || !isValidEmail(userData.email)) {
    throw new HttpsError('invalid-argument', 'Valid customer email is required');
  }
  
  if (!orderData?.orderNumber) {
    throw new HttpsError('invalid-argument', 'Order data is required');
  }

  try {
    console.log(`🔍 Processing B2B order confirmation for: ${userData.email}`);

    // Get user's preferred language
    const preferredLang = await getUserPreferredLanguage(userData.email);

    // Get email template
    const template = getB2BOrderConfirmationCustomerTemplate({
      userData,
      orderData,
      orderSummary,
      totalAmount
    }, preferredLang);

    // Send the email
    const messageId = await sendEmailV3(userData.email, template.subject, template.html);

    console.log(`✅ B2B order confirmation sent successfully to ${userData.email}`);

    return {
      success: true,
      email: userData.email,
      orderNumber: orderData.orderNumber,
      language: preferredLang,
      messageId
    };

  } catch (error) {
    console.error('❌ B2B order confirmation failed:', error);
    throw new HttpsError('internal', 'Failed to send order confirmation');
  }
});

// V3 Order Status Update Function
export const sendOrderStatusEmailV3 = onCall(async (request) => {
  console.log('🚀 sendOrderStatusEmailV3: Starting...');
  
  const { data } = request;
  
  const { orderData, userData, newStatus, previousStatus, trackingNumber, estimatedDelivery, notes } = data as OrderStatusUpdateData;
  
  if (!userData?.email || !isValidEmail(userData.email)) {
    throw new HttpsError('invalid-argument', 'Valid customer email is required');
  }
  
  if (!orderData?.orderNumber || !newStatus) {
    throw new HttpsError('invalid-argument', 'Order data and new status are required');
  }

  try {
    console.log(`🔍 Processing order status update for: ${userData.email} - ${orderData.orderNumber} → ${newStatus}`);

    // Get user's preferred language
    const preferredLang = await getUserPreferredLanguage(userData.email);

    // Get email template
    const template = getOrderStatusUpdateTemplate({
      orderData,
      userData,
      newStatus,
      previousStatus,
      trackingNumber,
      estimatedDelivery,
      notes
    }, preferredLang);

    // Send the email
    const messageId = await sendEmailV3(userData.email, template.subject, template.html);

    console.log(`✅ Order status update sent successfully to ${userData.email}`);

    return {
      success: true,
      email: userData.email,
      orderNumber: orderData.orderNumber,
      newStatus,
      language: preferredLang,
      messageId
    };

  } catch (error) {
    console.error('❌ Order status update failed:', error);
    throw new HttpsError('internal', 'Failed to send order status update');
  }
});

// V3 B2B Order Confirmation Admin Function
export const sendB2BOrderConfirmationAdminV3 = onCall(async (request) => {
  console.log('🚀 sendB2BOrderConfirmationAdminV3: Starting...');
  
  const { data } = request;
  const { userData, orderData, orderSummary, totalAmount } = data as B2BOrderConfirmationAdminData;
  
  if (!orderData?.orderNumber) {
    throw new HttpsError('invalid-argument', 'Order data is required');
  }

  try {
    console.log(`🔍 Processing admin B2B notification for order: ${orderData.orderNumber}`);

    // Admin emails are always in Swedish
    const preferredLang = 'sv-SE';

    // Get email template
    const template = getB2BOrderConfirmationAdminTemplate({
      userData, orderData, orderSummary, totalAmount
    }, preferredLang);

    // Send to all admin emails
    const adminEmails = ['micke.ohlen@gmail.com']; // TODO: Make this configurable
    const emailPromises = adminEmails.map(email => 
      sendEmailV3(email, template.subject, template.html)
    );
    const messageIds = await Promise.all(emailPromises);

    console.log(`✅ Admin B2B notification sent successfully for order: ${orderData.orderNumber}`);

    return {
      success: true,
      orderNumber: orderData.orderNumber,
      language: preferredLang,
      messageIds
    };

  } catch (error) {
    console.error('❌ Admin B2B notification failed:', error);
    throw new HttpsError('internal', 'Failed to send admin notification');
  }
});

// V3 Email Verification Function (Simple implementation)
export const sendVerificationEmailV3 = onCall(async (request) => {
  console.log('🚀 sendVerificationEmailV3: Starting...');
  
  const { auth: userAuth, data } = request;
  
  // Verify admin authentication
  await verifyAdminAuth(userAuth?.uid);
  
  const { email } = data as { email: string };
  
  if (!email || !isValidEmail(email)) {
    throw new HttpsError('invalid-argument', 'Valid email is required');
  }

  try {
    console.log(`🔍 Processing email verification for: ${email}`);

    // Simple verification email (reusing password reset pattern)
    const verificationCode = Math.random().toString(36).substring(2, 15);
    const preferredLang = await getUserPreferredLanguage(email);

    const subject = preferredLang.startsWith('en') ? 'Email Verification Required' : 'E-postverifiering krävs';
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: #1f2937;">${preferredLang.startsWith('en') ? 'Email Verification' : 'E-postverifiering'}</h2>
    <p style="color: #374151; line-height: 1.6;">${preferredLang.startsWith('en') ? 'Please verify your email address to complete your account setup.' : 'Vänligen verifiera din e-postadress för att slutföra kontoinställningen.'}</p>
    <div style="text-align: center; margin: 30px 0;">
      <p style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold;">${verificationCode}</p>
    </div>
    <p style="color: #6b7280; font-size: 14px;">${preferredLang.startsWith('en') ? 'This verification code will expire in 24 hours.' : 'Denna verifieringskod kommer att gå ut inom 24 timmar.'}</p>
  </div>
</div>`;

    const messageId = await sendEmailV3(email, subject, html);

    console.log(`✅ Email verification sent successfully to ${email}`);

    return {
      success: true,
      email,
      language: preferredLang,
      messageId
    };

  } catch (error) {
    console.error('❌ Email verification failed:', error);
    throw new HttpsError('internal', 'Failed to send verification email');
  }
});

// TODO: Add remaining 2 V3 functions:
// - sendAffiliateCredentialsV3
// - approveAffiliateV3
