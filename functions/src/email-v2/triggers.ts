// V3 Email System Firestore Triggers
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailService } from './EmailService';
import { getB2COrderPendingTemplate } from './templates/b2cOrderPending';
import { getAdminB2COrderNotificationTemplate } from './templates/adminB2COrderNotification';
import { getB2BOrderConfirmationCustomerTemplate } from './templates/b2bOrderConfirmationCustomer';
import { getB2BOrderConfirmationAdminTemplate } from './templates/b2bOrderConfirmationAdmin';

// Initialize Firestore with named database
const db = getFirestore('b8s-reseller-db');

// Helper function for email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to determine user's preferred language
async function getUserPreferredLanguage(email: string): Promise<string> {
  let preferredLang = 'sv-SE';
  
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
    console.log('No B2C customer found, checking users...');
  }

  // Check users collection for B2B customers
  try {
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email).get();
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      preferredLang = userData.preferredLang || 'sv-SE';
      console.log(`Found B2B user with preferred language: ${preferredLang}`);
      return preferredLang;
    }
  } catch (error) {
    console.log('No user found, using default language');
  }

  return preferredLang;
}

// Helper function to send email using V3 system
async function sendEmailV3(to: string, subject: string, html: string): Promise<string> {
  console.log(`🔧 DEBUG: sendEmailV3 called with:`);
  console.log(`   📧 To: ${to}`);
  console.log(`   📝 Subject: ${subject}`);
  console.log(`   📄 HTML length: ${html.length} chars`);
  
  try {
    const emailService = EmailService.getInstance();
    console.log(`🔧 DEBUG: EmailService instance created`);
    
    // Verify connection first
    console.log(`🔧 DEBUG: Verifying SMTP connection...`);
    const connectionOk = await emailService.verifyConnection();
    console.log(`🔧 DEBUG: SMTP connection result: ${connectionOk}`);
    
    if (!connectionOk) {
      throw new Error('SMTP connection failed');
    }

    // Send the email
    console.log(`🔧 DEBUG: Sending email via EmailService...`);
    const messageId = await emailService.sendEmail({
      to,
      subject,
      html
    });
    
    console.log(`✅ DEBUG: EmailService.sendEmail successful, messageId: ${messageId}`);
    return messageId;
    
  } catch (error) {
    console.error(`❌ DEBUG: EmailService failed for ${to}:`, error);
    console.error(`❌ DEBUG: Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack?.substring(0, 500) + '...' : undefined
    });
    throw error;
  }
}

// V3 Order Confirmation Emails Trigger
export const sendOrderConfirmationEmailsV3 = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    database: 'b8s-reseller-db'
  },
  async (event) => {
    try {
      const orderData = event.data?.data() as any;
      const orderId = event.params?.orderId;
      
      if (!orderData?.orderNumber || !orderData.items || !orderData.items.length) {
        console.error('Invalid order data:', orderData);
        return;
      }

      console.log(`🚀 V3 Email trigger fired for order ${orderData.orderNumber} (ID: ${orderId})`);
      console.log(`🔍 DEBUG: Order source: ${orderData.source}`);
      console.log(`🔍 DEBUG: Order data keys:`, Object.keys(orderData));
      console.log(`🔍 DEBUG: Items count: ${orderData.items?.length || 0}`);
      console.log(`🔍 DEBUG: Customer info:`, orderData.customerInfo ? 'Present' : 'Missing');

      let customerEmail: string = '';

      // Handle B2C vs B2B orders
      if (orderData.source === 'b2c') {
        console.log(`📱 DEBUG: Processing B2C order path`);
        // B2C Order Processing
        customerEmail = orderData.customerInfo?.email || '';
        
        if (customerEmail && isValidEmail(customerEmail)) {
          console.log(`📧 Processing B2C order confirmation for: ${customerEmail}`);

          // Get user's preferred language
          const preferredLang = await getUserPreferredLanguage(customerEmail);

          // Send customer confirmation email
          const customerTemplate = getB2COrderPendingTemplate({
            orderData,
            customerInfo: orderData.customerInfo,
            orderId
          }, preferredLang);

          const customerMessageId = await sendEmailV3(customerEmail, customerTemplate.subject, customerTemplate.html);
          console.log(`✅ B2C customer confirmation sent to ${customerEmail}, messageId: ${customerMessageId}`);

          // Send admin notification
          const adminTemplate = getAdminB2COrderNotificationTemplate({
            orderData
          }, 'sv-SE');

          const adminEmails = ['info@jphinnovation.se', 'micke.ohlen@gmail.com'];
          console.log(`🔍 DEBUG: B2C Admin emails array (business email first):`, adminEmails);
          console.log(`🔍 DEBUG: Admin template subject: ${adminTemplate.subject}`);
          console.log(`🔍 DEBUG: Admin template HTML length: ${adminTemplate.html.length} chars`);
          
          const adminPromises = adminEmails.map(async (email, index) => {
            console.log(`📧 DEBUG: Sending B2C admin email ${index + 1}/${adminEmails.length} to: ${email}`);
            try {
              const messageId = await sendEmailV3(email, adminTemplate.subject, adminTemplate.html);
              console.log(`✅ DEBUG: B2C admin email sent successfully to ${email}, messageId: ${messageId}`);
              return { email, success: true, messageId };
            } catch (error) {
              console.error(`❌ DEBUG: B2C admin email FAILED to ${email}:`, error);
              return { email, success: false, error: error instanceof Error ? error.message : String(error) };
            }
          });
          
          const adminResults = await Promise.all(adminPromises);
          const successCount = adminResults.filter(r => r.success).length;
          console.log(`🎉 DEBUG: B2C admin notifications completed. Success: ${successCount}/${adminResults.length}`);
          adminResults.forEach(result => {
            if (result.success) {
              console.log(`  ✅ ${result.email}: ${result.messageId}`);
            } else {
              console.log(`  ❌ ${result.email}: ${result.error}`);
            }
          });
        } else {
          console.log(`❌ Invalid or missing customer email for B2C order: ${customerEmail}`);
        }

      } else {
        console.log(`🏢 DEBUG: Processing B2B order path`);
        // B2B Order Processing
        if (!orderData.userId) {
          console.error('B2B order missing userId:', orderData.orderNumber);
          return;
        }

        // Get user data
        const userDoc = await db.collection('users').doc(orderData.userId).get();
        if (!userDoc.exists) {
          console.error(`B2B user with ID ${orderData.userId} not found for order ${orderData.orderNumber}`);
          return;
        }

        const userData = userDoc.data() as any;
        customerEmail = userData.email;

        if (customerEmail && isValidEmail(customerEmail)) {
          console.log(`📧 Processing B2B order confirmation for: ${customerEmail}`);

          // Get user's preferred language
          const preferredLang = await getUserPreferredLanguage(customerEmail);

          // Calculate totals for B2B template
          const totalAmount = orderData.prisInfo?.totalPris || 0;
          const totalPackages = orderData.antalForpackningar || 0;
          const totalColors = orderData.orderDetails?.totalColors || 1;
          const orderSummary = `${totalPackages} förpackningar i ${totalColors} färg${totalColors > 1 ? 'er' : ''}`;

          // Send customer confirmation email
          const customerTemplate = getB2BOrderConfirmationCustomerTemplate({
            userData,
            orderData,
            orderSummary,
            totalAmount
          }, preferredLang);

          const customerMessageId = await sendEmailV3(customerEmail, customerTemplate.subject, customerTemplate.html);
          console.log(`✅ B2B customer confirmation sent to ${customerEmail}, messageId: ${customerMessageId}`);

          // Send admin notification
          const adminTemplate = getB2BOrderConfirmationAdminTemplate({
            userData,
            orderData,
            orderSummary,
            totalAmount
          }, 'sv-SE');

          const adminEmails = ['info@jphinnovation.se', 'micke.ohlen@gmail.com'];
          console.log(`🔍 DEBUG: B2B Admin emails array (business email first):`, adminEmails);
          console.log(`🔍 DEBUG: B2B Admin template subject: ${adminTemplate.subject}`);
          console.log(`🔍 DEBUG: B2B Admin template HTML length: ${adminTemplate.html.length} chars`);
          
          const adminPromises = adminEmails.map((email, index) => {
            console.log(`📧 DEBUG: Sending B2B admin email ${index + 1}/${adminEmails.length} to: ${email}`);
            return sendEmailV3(email, adminTemplate.subject, adminTemplate.html)
              .then(messageId => {
                console.log(`✅ DEBUG: B2B admin email sent successfully to ${email}, messageId: ${messageId}`);
                return messageId;
              })
              .catch(error => {
                console.error(`❌ DEBUG: B2B admin email FAILED to ${email}:`, error);
                throw error;
              });
          });
          
          const adminMessageIds = await Promise.all(adminPromises);
          console.log(`🎉 DEBUG: All B2B admin notifications completed. MessageIds: ${adminMessageIds.join(', ')}`);
        } else {
          console.log(`❌ Invalid or missing customer email for B2B order: ${customerEmail}`);
        }
      }

      console.log(`🎉 Order confirmation emails completed for order ${orderData.orderNumber}`);

    } catch (error) {
      console.error(`❌ Error sending V3 confirmation emails for order ${event.params?.orderId}:`, error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }
);
