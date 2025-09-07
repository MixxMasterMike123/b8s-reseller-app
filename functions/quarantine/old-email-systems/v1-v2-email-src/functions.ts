
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { getApp } from 'firebase-admin/app';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { appUrls } from '../config/app-urls';
import { sendEmail, db, EMAIL_FROM, ADMIN_EMAILS } from './email-handler';
import { getEmail } from '../../emails';
import {
  EmailData,
  EmailTemplate,
  EmailTemplateParams,
  CustomerData,
  UserData,
  OrderData,
  B2BOrderConfirmationData,
  CustomerWelcomeData,
  AffiliateWelcomeData,
  B2COrderEmailData
} from './types';

// Add email validation function at the top of the file
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get Firebase Auth from already initialized app
const auth = getAuth(getApp());

// Helper function to create email data
function createEmailData(to: string, from: string, template: EmailTemplate, params?: EmailTemplateParams): EmailData {
  return {
    to,
    from,
    subject: template.subject,
    html: template.html,
    text: template.text,
    ...params
  };
}

// Helper function to generate temporary password
async function generateTemporaryPassword(): Promise<string> {
  try {
    // Use DinoPass API for strong password generation
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://www.dinopass.com/password/strong');
    
    if (response.ok) {
      const password = await response.text();
      return password.trim();
    } else {
      throw new Error('DinoPass API request failed');
    }
  } catch (error) {
    console.error('DinoPass API failed, falling back to local generation:', error);
    
    // Fallback to Swedish-friendly local generation if DinoPass API fails
    const adjectives = ['Blå', 'Grön', 'Röd', 'Gul', 'Stark', 'Snabb', 'Smart', 'Stor'];
    const nouns = ['Fisk', 'Bete', 'Vatten', 'Sjö', 'Hav', 'Spö', 'Rulle', 'Krok'];
    const numbers = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}${numbers}`;
  }
} 

// Send customer welcome email with credentials
export const sendCustomerWelcomeEmail = onCall<CustomerWelcomeData>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { customerId } = data;
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    // Get customer data
    const customerDoc = await db.collection('users').doc(customerId).get();
    if (!customerDoc.exists) {
      throw new Error('Customer not found');
    }

    const customerData = customerDoc.data() as CustomerData;
    let isExistingUser = false;
    let temporaryPassword = await generateTemporaryPassword();
    let userRecord;

    try {
      // Try to create new Firebase Auth account
      userRecord = await auth.createUser({
        email: customerData.email,
        password: temporaryPassword,
        emailVerified: true
      });
      console.log(`Created new Firebase Auth user for ${customerData.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        // If user exists, update their password
        const existingUser = await auth.getUserByEmail(customerData.email);
        await auth.updateUser(existingUser.uid, {
          password: temporaryPassword
        });
        userRecord = existingUser;
        isExistingUser = true;
        console.log(`Updated existing user password for ${customerData.email}`);
      } else {
        throw error;
      }
    }

    // Update customer document with new credentials info
    await customerDoc.ref.update({
      credentialsSent: true,
      credentialsSentAt: new Date(),
      credentialsSentBy: userAuth.uid,
      firebaseAuthUid: userRecord.uid,
      requiresPasswordChange: true,
      temporaryPassword, // Store for admin reference
      credentialsHistory: FieldValue.arrayUnion({
        sentAt: new Date(),
        sentBy: userAuth.uid,
        isResend: isExistingUser
      })
    });

    // Send welcome email using existing template
    const emailTemplate = getEmail('welcomeCredentials', customerData.preferredLang || 'sv-SE', {
      customerData,
      temporaryPassword,
      wasExistingAuthUser: isExistingUser
    } as any);

    const emailData = createEmailData(
      customerData.email,
      EMAIL_FROM.system,
      emailTemplate,
      {
        userData: {
          email: customerData.email,
          companyName: customerData.companyName,
          contactPerson: customerData.contactPerson,
          preferredLang: customerData.preferredLang
        },
        tempPassword: temporaryPassword,
        wasExistingAuthUser: isExistingUser
      }
    );

    await sendEmail(emailData);
    console.log(`${isExistingUser ? 'New credentials' : 'Welcome email'} sent successfully to ${customerData.email} for customer ${customerId}${isExistingUser ? ' (existing user)' : ''}`);

    return { 
      success: true,
      isExistingUser,
      temporaryPassword,
      email: customerData.email
    };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
});

// Send affiliate welcome email with credentials
export const sendAffiliateWelcomeEmail = onCall<AffiliateWelcomeData>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { affiliateData, temporaryPassword } = data;
    if (!affiliateData || !temporaryPassword) {
      throw new Error('Affiliate data and temporary password are required');
    }

    // Send welcome email using existing template
    const emailTemplate = getEmail('affiliateWelcome', affiliateData.preferredLang || 'sv-SE', {
      affiliateData,
      temporaryPassword,
      wasExistingAuthUser: affiliateData.wasExistingAuthUser || false
    } as any);

    const emailData = createEmailData(
      affiliateData.email,
      EMAIL_FROM.affiliate,
      emailTemplate,
      {
        userData: {
          email: affiliateData.email,
          companyName: affiliateData.name || '',
          preferredLang: affiliateData.preferredLang
        },
        affiliateData,
        tempPassword: temporaryPassword,
        wasExistingAuthUser: affiliateData.wasExistingAuthUser
      }
    );

    await sendEmail(emailData);
    console.log(`${affiliateData.wasExistingAuthUser ? 'New credentials' : 'Welcome email'} sent successfully to affiliate ${affiliateData.email}`);

    return { 
      success: true,
      wasExistingAuthUser: affiliateData.wasExistingAuthUser || false,
      email: affiliateData.email
    };
  } catch (error) {
    console.error('Error sending affiliate welcome email:', error);
    throw new Error('Failed to send affiliate welcome email');
  }
});

// Send B2B order confirmation to admin
export const sendB2BOrderConfirmationAdmin = onCall<B2BOrderConfirmationData>(async (request) => {
  const { auth: userAuth } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { userData, orderData, orderSummary, totalAmount } = request.data;
    if (!userData || !orderData || !orderSummary) {
      throw new Error('Order data is incomplete');
    }

    // Send order confirmation to admin using existing template
    const templateParams: EmailTemplateParams = {
      userData,
      orderData,
      orderSummary,
      totalAmount
    };

    const emailTemplate: EmailTemplate = getEmail('b2bOrderConfirmationAdmin', 'sv-SE', templateParams);

    const emailData = createEmailData(
      ADMIN_EMAILS,
      EMAIL_FROM.system,
      emailTemplate,
      templateParams
    );

    await sendEmail(emailData);
    console.log(`B2B order confirmation sent to admin for order ${orderData.orderNumber}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending B2B order confirmation to admin:', error);
    throw new Error('Failed to send order confirmation to admin');
  }
});

// Send B2B order confirmation to customer
export const sendB2BOrderConfirmationCustomer = onCall<B2BOrderConfirmationData>(async (request) => {
  const { auth: userAuth } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { userData, orderData, orderSummary, totalAmount } = request.data;
    if (!userData || !orderData || !orderSummary) {
      throw new Error('Order data is incomplete');
    }

    // Send order confirmation to customer using existing template
    const templateParams: EmailTemplateParams = {
      userData,
      orderData,
      orderSummary,
      totalAmount
    };

    const emailTemplate: EmailTemplate = getEmail('b2bOrderConfirmationCustomer', userData.preferredLang || 'sv-SE', templateParams);

    const emailData: EmailData = createEmailData(
      userData.email,
      EMAIL_FROM.system,
      emailTemplate,
      templateParams
    );

    await sendEmail(emailData);
    console.log(`B2B order confirmation sent to customer ${userData.email} for order ${orderData.orderNumber}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending B2B order confirmation to customer:', error);
    throw new Error('Failed to send order confirmation to customer');
  }
});

// Types for order status emails
interface OrderStatusData extends OrderData {
  trackingNumber?: string;
  carrier?: string;
}

interface OrderStatusEmailData {
  userData: UserData;
  orderData: OrderStatusData;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

// Send order status update email
export const sendOrderStatusEmail = onCall<OrderStatusEmailData>(async (request) => {
  const { auth: userAuth } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { userData, orderData, status } = request.data;
    if (!userData || !orderData || !status) {
      throw new Error('Order data is incomplete');
    }

    // Map status to template name
    const templateMap = {
      pending: 'orderPending',
      confirmed: 'orderConfirmed',
      processing: 'orderProcessing',
      shipped: 'orderShipped',
      delivered: 'orderDelivered',
      cancelled: 'orderCancelled'
    };

    const templateName = templateMap[status];
    if (!templateName) {
      throw new Error('Invalid order status');
    }

    // Send status update email using existing template
    const templateParams: EmailTemplateParams = {
      userData,
      orderData
    };

    const emailTemplate: EmailTemplate = getEmail(templateName, userData.preferredLang || 'sv-SE', templateParams);

    const emailData: EmailData = createEmailData(
      userData.email,
      EMAIL_FROM.system,
      emailTemplate,
      templateParams
    );

    await sendEmail(emailData);
    console.log(`Order ${status} email sent to ${userData.email} for order ${orderData.orderNumber}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending order status email:', error);
    throw new Error('Failed to send order status email');
  }
});

// Send B2C order notification to admin
export const sendB2COrderNotificationAdmin = onCall<B2COrderEmailData>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { orderData, customerInfo, lang } = data;
    if (!orderData || !customerInfo) {
      throw new Error('Order data and customer info are required');
    }

    const emailTemplate = getEmail('adminB2COrderNotification', lang || 'sv-SE', {
      orderData,
      customerInfo
    } as any);

    const emailData = createEmailData(
      ADMIN_EMAILS,
      EMAIL_FROM.system,
      emailTemplate,
      {
        orderData,
        userData: {
          email: customerInfo.email,
          companyName: customerInfo.firstName + ' ' + (customerInfo.lastName || '')
        },
        customerInfo
      }
    );

    await sendEmail(emailData);
    console.log(`B2C order notification sent to admin for order ${orderData.orderNumber}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending B2C order notification to admin:', error);
    throw new Error('Failed to send B2C order notification to admin');
  }
});

// Send B2C order confirmation to customer
export const sendB2COrderPendingEmail = onCall<B2COrderEmailData>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { orderData, customerInfo, lang } = data;
    if (!orderData || !customerInfo) {
      throw new Error('Order data and customer info are required');
    }

    const emailTemplate = getEmail('b2cOrderPending', lang || 'sv-SE', {
      orderData,
      customerInfo
    } as any);

    const emailData = createEmailData(
      customerInfo.email,
      EMAIL_FROM.system,
      emailTemplate,
      {
        orderData,
        userData: {
          email: customerInfo.email,
          companyName: customerInfo.firstName + ' ' + (customerInfo.lastName || '')
        },
        customerInfo
      }
    );

    await sendEmail(emailData);
    console.log(`B2C order confirmation sent to customer ${customerInfo.email} for order ${orderData.orderNumber}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending B2C order confirmation to customer:', error);
    throw new Error('Failed to send B2C order confirmation to customer');
  }
});



// Send order confirmation emails on order creation
export const sendOrderConfirmationEmails = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    database: 'b8s-reseller-db'
  },
  async (event) => {
  try {
    const orderData = event.data?.data() as OrderData;
    const orderId = event.params?.orderId; // Get the Firebase document ID
    
    if (!orderData?.orderNumber || !orderData.items || !orderData.items.length) {
      console.error('Invalid order data:', orderData);
      return;
    }

    console.log(`Email trigger fired for order ${orderData.orderNumber} (ID: ${orderId}) from named database`);

    let customerEmail: string = '';
    let customerName: string = '';
    let customerTemplate: EmailTemplate | null = null;

    // Handle B2C (guest or simple auth user) vs B2B (full auth user)
    if (orderData.source === 'b2c') {
      // B2C Order - use customerInfo directly
      customerEmail = orderData.customerInfo?.email || '';
      customerName = orderData.customerInfo?.firstName || 'Customer';
      
      if (customerEmail) {
        const customerLang = orderData.customerInfo?.preferredLang || 'sv-SE';
        customerTemplate = getEmail('b2cOrderPending', customerLang, {
          orderData,
          customerInfo: orderData.customerInfo,
          orderId // Pass the Firebase document ID for order tracking URL
        } as any);
        console.log(`Using customer language: ${customerLang} for B2C email`);
      }
      
      console.log(`B2C order processed for customer: ${customerEmail}`);

    } else {
      // B2B Order - lookup user data
      if (!orderData.userId) {
        console.error('B2B order missing userId:', orderData.orderNumber);
      return;
    }

      const userDoc = await db.collection('users').doc(orderData.userId).get();
      if (!userDoc.exists) {
        console.error(`B2B user with ID ${orderData.userId} not found for order ${orderData.orderNumber}`);
        return;
      }

      const userData = userDoc.data() as UserData;
      customerEmail = userData.email;
      customerName = userData.contactPerson || userData.companyName || '';

      customerTemplate = getEmail('orderConfirmed', userData.preferredLang || 'sv-SE', {
      orderData,
      userData,
        customerInfo: orderData.customerInfo,
        orderId // Pass the Firebase document ID for order tracking URL
      } as any);

      console.log(`B2B order processed for customer: ${customerEmail}`);
    }

    // 1. Send email to customer (if email is available and template was generated)
    if (customerEmail && customerTemplate) {
      // Validate email address before sending
      if (!isValidEmail(customerEmail)) {
        console.error(`Invalid customer email address: ${customerEmail} for order ${orderData.orderNumber}`);
        return; // Skip sending email but don't fail the entire process
      }

      const emailData = createEmailData(
        customerEmail,
        orderData.source === 'b2c' ? EMAIL_FROM.b2c : EMAIL_FROM.b2b,
        customerTemplate,
        {
          orderData,
          customerInfo: orderData.customerInfo
        }
      );

      await sendEmail(emailData);
      console.log(`Order confirmation email sent to ${customerEmail}`);
    } else {
      console.log(`No customer email available or template could not be generated for order ${orderData.orderNumber}. Skipping customer confirmation.`);
    }

    // 2. Send admin notification
    const adminTemplate = getEmail('adminB2COrderNotification', 'sv-SE', {
      orderData,
      customerInfo: orderData.customerInfo || { email: customerEmail, firstName: customerName },
      orderId // Pass the Firebase document ID for order tracking URL
    } as any);

    const adminEmailData = createEmailData(
      ADMIN_EMAILS,
      EMAIL_FROM.system,
      adminTemplate,
      {
        orderData,
        customerInfo: orderData.customerInfo || { email: customerEmail, firstName: customerName }
      }
    );

    await sendEmail(adminEmailData);
    console.log(`Admin notification sent for order ${orderData.orderNumber}`);

  } catch (error: unknown) {
    console.error(`Error sending confirmation emails for order ${event.params?.orderId}:`, error);
  }
});

// Send email when user is activated
export const sendUserActivationEmail = onDocumentUpdated(
  {
    document: 'users/{userId}',
    database: 'b8s-reseller-db'
  },
  async (event) => {
  try {
    const beforeData = event.data?.before.data() as UserData;
    const afterData = event.data?.after.data() as UserData;
    const userId = event.params.userId;

    // Check if user was activated
    if (!beforeData.isActive && afterData.isActive) {
      const email = {
        from: EMAIL_FROM.system,
        to: afterData.email,
        subject: "Ditt B8Shield-konto är nu aktivt",
        text: `
          Hej ${afterData.contactPerson},
          
          Ditt B8Shield-konto för ${afterData.companyName} har aktiverats!
          
          Du kan nu logga in med ditt användarnamn och lösenord på:
          ${appUrls.B2B_PORTAL}
          
          Om du har några frågor, kontakta vår support.
          
          Med vänliga hälsningar,
          B8Shield Team
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${appUrls.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
            </div>
            <h2>Hej ${afterData.contactPerson},</h2>
            
            <p>Ditt B8Shield-konto för <strong>${afterData.companyName}</strong> har aktiverats!</p>
            
            <p>Du kan nu logga in med ditt användarnamn och lösenord på:<br>
            <a href="${appUrls.B2B_PORTAL}">B8Shield Portal</a></p>
            
            <p>Om du har några frågor, kontakta vår support.</p>
            
            <p>Med vänliga hälsningar,<br>B8Shield Team</p>
          </div>
        `,
      };
      
      await sendEmail(email);
      console.log(`Activation email sent to user ${userId}`);
    }
    
    return null;
  } catch (error) {
    console.error("Error sending user activation email:", error);
    return null;
  }
});

// Send order status update emails
export const sendOrderStatusUpdateEmail = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    database: 'b8s-reseller-db'
  },
  async (event) => {
  try {
    const beforeData = event.data?.before.data() as OrderData;
    const afterData = event.data?.after.data() as OrderData;
    const orderId = event.params.orderId;

    // Check if status changed and userId exists
    if (beforeData.status !== afterData.status && afterData.userId) {
      // Get user data
      const userSnapshot = await db
        .collection("users")
        .doc(afterData.userId)
        .get();
      
      if (!userSnapshot.exists) {
        console.error(`User ${afterData.userId} not found for order ${orderId}`);
        return null;
      }

      const userData = userSnapshot.data() as UserData;
      const templateParams: EmailTemplateParams = {
        userData,
        orderData: afterData,
        status: afterData.status
      };

      const template = getEmail('orderStatusUpdate', userData.preferredLang || 'sv-SE', templateParams);

      // Email to user
      const emailData = createEmailData(
        userData.email,
        afterData.source === 'b2c' ? EMAIL_FROM.system : EMAIL_FROM.system,
        template,
        templateParams
      );
      
      // Send email to user
      await sendEmail(emailData);
      
      // Also notify admin for important status changes
      if (['shipped', 'delivered', 'cancelled'].includes(afterData.status)) {
        const adminTemplate = {
          subject: `Order Status Update: ${afterData.orderNumber}`,
          text: `
            Order ${afterData.orderNumber} status has been updated to: ${afterData.status}
            
            Customer: ${userData.companyName} (${userData.email})
            Contact: ${userData.contactPerson}
            
            ${afterData.trackingNumber ? `Tracking: ${afterData.trackingNumber}` : ''}
            ${afterData.carrier ? `Carrier: ${afterData.carrier}` : ''}
          `,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${appUrls.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
              </div>
              <h2>Order Status Update</h2>
              <p><strong>Order:</strong> ${afterData.orderNumber}</p>
              <p><strong>New Status:</strong> ${afterData.status}</p>
              
              <h3>Customer:</h3>
              <p>${userData.companyName} (${userData.email})<br>
              Contact: ${userData.contactPerson}</p>
              
              ${afterData.trackingNumber ? `<p><strong>Tracking:</strong> ${afterData.trackingNumber}</p>` : ''}
              ${afterData.carrier ? `<p><strong>Carrier:</strong> ${afterData.carrier}</p>` : ''}
            </div>
          `
        };
        
        const adminEmailData = createEmailData(
          ADMIN_EMAILS,
          EMAIL_FROM.system,
          adminTemplate,
          {
            orderData: afterData,
            userData
          }
        );
        
        await sendEmail(adminEmailData);
      }
      
      console.log(`Status update email sent for order ${orderId}: ${beforeData.status} -> ${afterData.status}`);
    }
    
    return null;
  } catch (error) {
    console.error("Error sending order status update email:", error);
    return null;
  }
});

// Update customer email (admin only)
export const updateCustomerEmail = onCall<{ userId: string; newEmail: string }>(async (request) => {
  const { auth: userAuth } = request;
  if (!userAuth?.uid) {
    throw new Error('Måste vara inloggad');
  }

  // Get admin status from named database
  const callerDoc = await db.collection('users').doc(userAuth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new Error('Måste vara administratör');
  }

  const { userId, newEmail } = request.data;

  try {
    // Get customer data from Firestore
    const customerDoc = await db.collection('users').doc(userId).get();
    if (!customerDoc.exists) {
      throw new Error('Kunden kunde inte hittas');
    }
    
    const customerData = customerDoc.data();
    
    // Check if Firebase Auth account exists, if not create one
    let authUser;
    try {
      // Try to get existing auth user by the current email
      authUser = await auth.getUserByEmail(customerData?.email || '');
      console.log(`Found existing Firebase Auth user for ${customerData?.email}`);
      
      // Update existing user's email
      await auth.updateUser(authUser.uid, {
        email: newEmail,
        emailVerified: false
      });
      console.log(`Updated existing user email to ${newEmail}`);
      
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        // User doesn't exist in Firebase Auth, create new account
        console.log(`Creating new Firebase Auth account for ${newEmail}`);
        authUser = await auth.createUser({
          email: newEmail,
          displayName: customerData?.contactPerson || customerData?.companyName,
          emailVerified: false,
        });
        console.log(`Created new Firebase Auth user: ${authUser.uid}`);
        
        // Update Firestore with the new auth UID
        await db.collection('users').doc(userId).update({
          firebaseAuthUid: authUser.uid,
          updatedAt: FieldValue.serverTimestamp()
        });
        
      } else {
        throw authError;
      }
    }

    // Update email in Firestore
    await db.collection('users').doc(userId).update({
      email: newEmail,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: 'E-post uppdaterad framgångsrikt',
      authAccountCreated: !authUser.uid // true if we created a new account
    };
  } catch (error: unknown) {
    console.error('Error updating user email:', error);
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
      throw new Error(`Firebase Auth fel: ${error.message}`);
    }
    throw new Error('Ett fel uppstod vid uppdatering av e-post');
  }
});

// Test email endpoint
export const testEmail = onRequest(async (req, res) => {
  try {
    console.log('Testing email functionality...');
    
    const testEmailTemplate = {
      subject: "Test Email from B8Shield Portal",
      text: "This is a test email to verify Gmail SMTP integration is working.",
      html: "<h2>Test Email</h2><p>This is a test email to verify Gmail SMTP integration is working.</p>"
    };

    const emailData = createEmailData(
      "micke.ohlen@gmail.com",
      EMAIL_FROM.system,
      testEmailTemplate,
      {}
    );

    await sendEmail(emailData);
    console.log('Test email sent successfully');
    
    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully',
      config: {
        service: 'gmail',
        from_email: 'b8shield.reseller@gmail.com'
      }
    });
  } catch (error: unknown) {
    console.error('Error sending test email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      config: {
        service: 'gmail',
        from_email: 'b8shield.reseller@gmail.com'
      }
    });
  }
}); 

// Types for affiliate approval
interface AffiliateApplicationData {
  applicationId: string;
  checkoutDiscount?: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  socials?: Record<string, string>;
  promotionMethod?: string;
  message?: string;
  preferredLang?: string;
}

interface AffiliateRecord {
  id: string;
  affiliateCode: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  socials?: Record<string, string>;
  promotionMethod?: string;
  message?: string;
  status: 'active' | 'pending' | 'suspended';
  commissionRate: number;
  checkoutDiscount: number;
  preferredLang?: string; // Language preference for emails
  stats: {
    clicks: number;
    conversions: number;
    totalEarnings: number;
    balance: number;
  };
  // Credential tracking fields (similar to B2B customers)
  credentialsSent?: boolean;
  credentialsSentAt?: any; // Timestamp
  credentialsSentBy?: string;
  firebaseAuthUid?: string;
  requiresPasswordChange?: boolean;
  temporaryPassword?: string;
  credentialsHistory?: Array<{
    sentAt: any; // Timestamp
    sentBy: string;
    isResend: boolean;
  }>;
  createdAt: any; // Timestamp is not imported, so using 'any' for now
  updatedAt: any; // Timestamp is not imported, so using 'any' for now
}

// Types for email data
interface AffiliateEmailData {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  appData?: {
    name: string;
    email: string;
    preferredLang?: string;
  };
}

// Approve affiliate application and send welcome email
export const approveAffiliate = onCall<AffiliateApplicationData>(async (request) => {
  const { auth: userAuth } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  const adminUserDoc = await db.collection('users').doc(userAuth.uid).get();
  if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'admin') {
    throw new Error('Unauthorized - Admin only');
  }

  const { 
    applicationId,
    checkoutDiscount,
    name,
    email,
    phone,
    address,
    postalCode,
    city,
    country,
    socials,
    promotionMethod,
    message
  } = request.data;

  if (!applicationId) {
    throw new Error('Application ID is required');
  }

  try {
    const applicationRef = db.collection('affiliateApplications').doc(applicationId);
    const applicationDoc = await applicationRef.get();
    
    if (!applicationDoc.exists) {
      throw new Error('Affiliate application not found');
    }
    const appData = applicationDoc.data();
    if (!appData) {
      throw new Error('Application data is missing');
    }

    // Create Firebase Auth user
    const tempPassword = Math.random().toString(36).slice(-8);
    let authUser;
    let wasExistingAuthUser = false;

    try {
      authUser = await auth.createUser({
        email: appData.email,
        emailVerified: true,
        password: tempPassword,
        displayName: appData.name,
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        authUser = await auth.getUserByEmail(appData.email);
        wasExistingAuthUser = true;
        console.log(`User with email ${appData.email} already exists. Using existing auth UID.`);
      } else {
        throw error;
      }
    }

    // Generate affiliate code
    const namePart = appData.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
    const randomPart = Math.floor(100 + Math.random() * 900);
    const affiliateCode = `${namePart}-${randomPart}`;

    // Create affiliate record
    const affiliateRef = db.collection('affiliates').doc(authUser.uid);
    
    const newAffiliateData: AffiliateRecord = {
      id: authUser.uid,
      affiliateCode,
      name,
      email,
      phone,
      address,
      postalCode,
      city,
      country,
      socials,
      promotionMethod,
      message,
      status: 'active',
      commissionRate: 15,
      checkoutDiscount: checkoutDiscount || 10,
      stats: {
        clicks: 0,
        conversions: 0,
        totalEarnings: 0,
        balance: 0,
      },
      createdAt: new Date(), // Placeholder for Timestamp
      updatedAt: new Date() // Placeholder for Timestamp
    };

    await affiliateRef.set(newAffiliateData);
    await applicationRef.delete();
    
    // Generate login instructions in Swedish
    const loginInstructions = wasExistingAuthUser
      ? `<p>Du hade redan ett konto hos B8Shield, så du kan logga in med ditt befintliga lösenord. Om du har glömt det kan du återställa det på inloggningssidan.</p>`
      : `<ul>
          <li><strong>Användarnamn:</strong> ${appData.email}</li>
          <li><strong>Tillfälligt lösenord:</strong> ${tempPassword}</li>
        </ul>
        <p>Vi rekommenderar starkt att du byter ditt lösenord efter första inloggningen.</p>`;

    // Send welcome email using template with all translations
    const emailTemplate = getEmail('affiliateWelcome', appData.preferredLang || 'sv-SE', {
      appData,
      affiliateCode,
      tempPassword,
      loginInstructions,
      wasExistingAuthUser
    } as any);

    const emailData: AffiliateEmailData = {
      to: appData.email,
      from: EMAIL_FROM.affiliate,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      appData: {
        name: appData.name,
        email: appData.email,
        preferredLang: appData.preferredLang
      }
    };

    await sendEmail(emailData);
    console.log(`Welcome email sent successfully to affiliate ${appData.email}`);

    return { 
      success: true, 
      affiliateCode,
      wasExistingAuthUser
    };

  } catch (error) {
    console.error('Error approving affiliate:', error);
    throw new Error('Failed to approve affiliate');
  }
}); 

// HTTP endpoint for sending order status update emails (called from frontend)
export const sendStatusUpdateHttp = onRequest(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
  },
  async (request, response) => {
    try {
      console.log('HTTP status update request received');

      if (request.method !== 'POST') {
        response.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }

      const { orderId, orderData, userData, oldStatus, newStatus } = request.body;

      if (!orderId || !orderData || !newStatus) {
        response.status(400).json({
          success: false,
          error: 'Missing required data: orderId, orderData, newStatus'
        });
        return;
      }

      console.log(`Sending status update emails for order ${orderId}: ${oldStatus} -> ${newStatus}`);

      // Determine customer email and info based on order source (B2C vs B2B)
      let customerEmail: string = '';
      let customerLang: string = 'sv-SE';
      let customerName: string = '';
      let templateParams: any = {};

      if (orderData.source === 'b2c') {
        // B2C Order - use customerInfo from order
        customerEmail = orderData.customerInfo?.email || '';
        customerName = orderData.customerInfo?.firstName || 'Customer';
        customerLang = orderData.customerInfo?.preferredLang || 'sv-SE';
        
        // Create mock userData for B2C orders
        templateParams = {
          userData: {
            email: customerEmail,
            companyName: customerName,
            contactPerson: customerName,
            preferredLang: customerLang
          },
          orderData: { ...orderData, status: newStatus },
          customerInfo: orderData.customerInfo,
          status: newStatus
        };
        
        console.log(`B2C order status update for customer: ${customerEmail}`);
      } else {
        // B2B Order - use userData passed from frontend
        if (!userData) {
          response.status(400).json({
            success: false,
            error: 'userData is required for B2B orders'
          });
          return;
        }
        
        customerEmail = userData.email;
        customerName = userData.contactPerson || userData.companyName || '';
        customerLang = userData.preferredLang || 'sv-SE';
        
        templateParams = {
          userData,
          orderData: { ...orderData, status: newStatus },
          status: newStatus
        };
        
        console.log(`B2B order status update for customer: ${customerEmail}`);
      }

      // Validate email address before proceeding
      if (!customerEmail || !isValidEmail(customerEmail)) {
        console.error(`Invalid email address for customer: ${customerEmail}`);
        response.status(400).json({
          success: false,
          error: 'Invalid email address'
        });
        return;
      }

      // Map status to correct email template name
      const getTemplateNameForStatus = (status: string): string => {
        switch (status) {
          case 'pending': return 'orderPending';
          case 'confirmed': return 'orderConfirmed';
          case 'processing': return 'orderProcessing';
          case 'shipped': return 'orderShipped';
          case 'delivered': return 'orderDelivered';
          case 'cancelled': return 'orderCancelled';
          default: return 'orderConfirmed'; // fallback
        }
      };

      // Get email template for the new status
      const templateName = getTemplateNameForStatus(newStatus);
      const template = getEmail(templateName, customerLang, templateParams);

      // Customer status update email
      const customerEmailData = createEmailData(
        customerEmail,
        orderData.source === 'b2c' ? EMAIL_FROM.b2c : EMAIL_FROM.b2b,
        template,
        templateParams
      );

      // Send customer email
      await sendEmail(customerEmailData);

      // Also notify admin for important status changes
      if (['shipped', 'delivered', 'cancelled'].includes(newStatus)) {
        const adminTemplate = {
          subject: `Order Status Update: ${orderData.orderNumber}`,
          text: `
            Order ${orderData.orderNumber} status has been updated to: ${newStatus}
            
            Customer: ${customerName} (${customerEmail})
            ${orderData.source === 'b2b' ? `Contact: ${userData?.contactPerson || ''}` : ''}
            
            ${orderData.trackingNumber ? `Tracking: ${orderData.trackingNumber}` : ''}
            ${orderData.carrier ? `Carrier: ${orderData.carrier}` : ''}
          `,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${appUrls.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
              </div>
              <h2>Order Status Update</h2>
              <p><strong>Order:</strong> ${orderData.orderNumber}</p>
              <p><strong>New Status:</strong> ${newStatus}</p>
              
              <h3>Customer:</h3>
              <p>${customerName} (${customerEmail})<br>
              ${orderData.source === 'b2b' ? `Contact: ${userData?.contactPerson || ''}` : ''}</p>
              
              ${orderData.trackingNumber ? `<p><strong>Tracking:</strong> ${orderData.trackingNumber}</p>` : ''}
              ${orderData.carrier ? `<p><strong>Carrier:</strong> ${orderData.carrier}</p>` : ''}
            </div>
          `,
        };

        const adminEmailData = createEmailData(
          ADMIN_EMAILS,
          EMAIL_FROM.system,
          adminTemplate as EmailTemplate,
          {
            orderData: { ...orderData, status: newStatus },
            userData: templateParams.userData,
            customerInfo: orderData.customerInfo
          }
        );

        await sendEmail(adminEmailData);
      }

      console.log(`Status update emails sent for order ${orderId}: ${oldStatus} -> ${newStatus}`);

      response.status(200).json({
        success: true,
        message: 'Status update emails sent successfully',
        orderId: orderId,
        orderNumber: orderData.orderNumber,
        status: newStatus
      });

    } catch (error: unknown) {
      console.error('Error sending status update emails:', error);
      response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
); 

/**
 * Send email verification to a B2C customer (Admin only)
 */
export const sendVerificationEmail = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
  },
  async (request) => {
    const { auth, data } = request;
    
    // Verify admin authentication
    if (!auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Get admin user data to verify admin role
    const adminDoc = await db.collection('users').doc(auth.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { email } = data;
    
    if (!email) {
      throw new HttpsError('invalid-argument', 'Email is required');
    }

    try {
      console.log(`Admin ${auth.uid} requesting email verification for customer: ${email}`);
      
      // Find the customer in Firebase Auth by email
      const admin = require('firebase-admin');
      const userRecord = await admin.auth().getUserByEmail(email);
      
      if (!userRecord) {
        throw new HttpsError('not-found', 'Customer not found in authentication system');
      }

      if (userRecord.emailVerified) {
        throw new HttpsError('failed-precondition', 'Email is already verified');
      }

      // Generate email verification link
      const actionCodeSettings = {
        url: 'https://shop.b8shield.com/__/auth/action',
        handleCodeInApp: true
      };

      const verificationLink = await admin.auth().generateEmailVerificationLink(
        email, 
        actionCodeSettings
      );

      // Send email using the existing email system
      const customerName = userRecord.displayName || 'Kund';
      const emailData = {
        to: email,
        from: EMAIL_FROM.b2c,
        subject: 'Verifiera din e-postadress - B8Shield',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://firebasestorage.googleapis.com/v0/b/b8shield-reseller-app.firebasestorage.app/o/images%2FB8S_logo.png?alt=media" alt="B8Shield" style="max-width: 200px; height: auto;">
              </div>
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${customerName},</h2>
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                Klicka på länken nedan för att verifiera din e-postadress och aktivera ditt B8Shield-konto:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Verifiera e-postadress
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Om du inte kan klicka på knappen, kopiera och klistra in denna länk i din webbläsare:<br>
                <a href="${verificationLink}" style="color: #2563eb; word-break: break-all;">${verificationLink}</a>
              </p>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
Hej ${customerName},

Klicka på länken nedan för att verifiera din e-postadress:
${verificationLink}

Med vänliga hälsningar,
B8Shield Team
JPH Innovation AB
        `
      };

      await sendEmail(emailData);
      
      console.log(`✅ Email verification sent to ${email} by admin ${auth.uid}`);
      
      return { 
        success: true, 
        message: 'Email verification sent successfully' 
      };
      
    } catch (error) {
      console.error('Error sending verification email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpsError('internal', `Failed to send verification email: ${errorMessage}`);
    }
  }
); 

// Send affiliate credentials and welcome email
export const sendAffiliateCredentialsV2 = onCall<{ affiliateId: string }>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Unauthorized');
  }

  try {
    const { affiliateId } = data;
    if (!affiliateId) {
      throw new Error('Affiliate ID is required');
    }

    // Get affiliate data
    const affiliateDoc = await db.collection('affiliates').doc(affiliateId).get();
    if (!affiliateDoc.exists) {
      throw new Error('Affiliate not found');
    }

    const affiliateData = affiliateDoc.data() as AffiliateRecord;
    let isExistingUser = false;
    let temporaryPassword = await generateTemporaryPassword();
    let userRecord;

    try {
      // Try to create new Firebase Auth account
      userRecord = await auth.createUser({
        email: affiliateData.email,
        password: temporaryPassword,
        emailVerified: true,
        displayName: affiliateData.name
      });
      console.log(`Created new Firebase Auth user for affiliate ${affiliateData.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        // If user exists, update their password
        const existingUser = await auth.getUserByEmail(affiliateData.email);
        await auth.updateUser(existingUser.uid, {
          password: temporaryPassword
        });
        userRecord = existingUser;
        isExistingUser = true;
        console.log(`Updated existing affiliate user password for ${affiliateData.email}`);
      } else {
        throw error;
      }
    }

    // Update affiliate document with new credentials info
    await affiliateDoc.ref.update({
      credentialsSent: true,
      credentialsSentAt: new Date(),
      credentialsSentBy: userAuth.uid,
      firebaseAuthUid: userRecord.uid,
      requiresPasswordChange: true,
      temporaryPassword, // Store for admin reference
      credentialsHistory: FieldValue.arrayUnion({
        sentAt: new Date(),
        sentBy: userAuth.uid,
        isResend: isExistingUser
      })
    });

    // Generate login instructions
    const loginInstructions = isExistingUser
      ? `<p>Du hade redan ett konto hos B8Shield, så du kan logga in med ditt befintliga lösenord. Om du har glömt det kan du återställa det på inloggningssidan.</p>`
      : `<ul>
          <li><strong>Användarnamn:</strong> ${affiliateData.email}</li>
          <li><strong>Tillfälligt lösenord:</strong> ${temporaryPassword}</li>
        </ul>
        <p>Vi rekommenderar starkt att du byter ditt lösenord efter första inloggningen.</p>`;

    // Normalize language code (GB -> en-GB, US -> en-US, etc.)
    const normalizeLanguageCode = (lang?: string): string => {
      if (!lang) return 'sv-SE';
      const normalized = lang.toLowerCase();
      if (normalized === 'gb' || normalized === 'en-gb') return 'en-GB';
      if (normalized === 'us' || normalized === 'en-us') return 'en-US';
      if (normalized.startsWith('en')) return 'en-GB'; // Default English to GB
      return 'sv-SE'; // Default to Swedish
    };

    const preferredLang = normalizeLanguageCode(affiliateData.preferredLang);
    console.log(`🌐 Affiliate ${affiliateData.email} preferredLang: "${affiliateData.preferredLang}" -> normalized: "${preferredLang}"`);

    // Send welcome email using imported getEmail (consistent with other functions)
    console.log(`📧 Getting email template for language: ${preferredLang}`);
    
    const emailTemplate = getEmail('affiliateWelcome', preferredLang, {
      appData: {
        name: affiliateData.name,
        email: affiliateData.email,
        preferredLang: preferredLang
      },
      affiliateCode: affiliateData.affiliateCode,
      tempPassword: temporaryPassword,
      loginInstructions,
      wasExistingAuthUser: isExistingUser
    } as any);

    console.log(`📧 Email template retrieved successfully for ${preferredLang}`);

    // Send email using imported functions (consistent with other functions)
    const emailData = {
      to: affiliateData.email,
      from: EMAIL_FROM.affiliate,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    console.log(`📧 Sending email to ${affiliateData.email}...`);
    await sendEmail(emailData);
    console.log(`${isExistingUser ? 'New credentials' : 'Welcome email'} sent successfully to affiliate ${affiliateData.email} for affiliate ${affiliateId}${isExistingUser ? ' (existing user)' : ''}`);

    return { 
      success: true,
      isExistingUser,
      temporaryPassword,
      email: affiliateData.email
    };
  } catch (error) {
    console.error('Error sending affiliate credentials:', error);
    throw new Error('Failed to send affiliate credentials');
  }
});

// Function to send custom password reset email
export const sendPasswordResetEmailV2 = onCall(async (request) => {
  console.log('🔍 sendPasswordResetEmailV2 function started');
  const { email } = request.data;
  console.log(`🔍 Email parameter received: ${email}`);

  if (!email || !isValidEmail(email)) {
    console.log('❌ Invalid email provided');
    throw new HttpsError('invalid-argument', 'Valid email is required');
  }

  try {
    console.log(`🔍 Processing password reset request for: ${email}`);

    // Generate secure reset code
    const resetCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const timestamp = new Date().toLocaleString('sv-SE');

    // Get user agent from request context
    const userAgent = request.rawRequest?.headers?.['user-agent'] || 'Unknown device';

    // Try to find user's preferred language
    let preferredLang = 'sv-SE';
    
    // Check if user exists in affiliates collection
    try {
      const affiliatesSnapshot = await db.collection('affiliates').where('email', '==', email).get();
      if (!affiliatesSnapshot.empty) {
        const affiliateData = affiliatesSnapshot.docs[0].data();
        preferredLang = affiliateData.preferredLang || affiliateData.lang || 'sv-SE';
        console.log(`Found affiliate with preferred language: ${preferredLang}`);
      }
    } catch (error) {
      console.log('No affiliate found, checking B2C customers...');
    }

    // Check if user exists in B2C customers collection
    try {
      const b2cCustomersSnapshot = await db.collection('b2cCustomers').where('email', '==', email).get();
      if (!b2cCustomersSnapshot.empty) {
        const customerData = b2cCustomersSnapshot.docs[0].data();
        preferredLang = customerData.preferredLang || customerData.lang || 'sv-SE';
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

    // Generate password reset email
    console.log(`🔍 Getting email template for language: ${preferredLang}`);
    const emailTemplate = getEmail('passwordReset', preferredLang, {
      email,
      resetCode,
      userAgent,
      timestamp
    } as any);
    console.log(`🔍 Email template retrieved successfully`);

    // Create email data
    console.log(`🔍 Creating email data with createEmailData function`);
    const emailData = createEmailData(
      email,
      EMAIL_FROM.system,
      emailTemplate
    );
    console.log(`🔍 Email data created successfully`);

    // Send the email
    console.log(`🔍 Calling sendEmail function...`);
    await sendEmail(emailData);
    console.log(`✅ Password reset email sent successfully to ${email} in language ${preferredLang}`);

    return { 
      success: true,
      email,
      language: preferredLang,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new HttpsError('internal', 'Failed to send password reset email');
  }
});

// Function to confirm password reset with custom code
export const confirmPasswordResetV2 = onCall(async (request) => {
  const { resetCode, newPassword } = request.data;

  if (!resetCode || !newPassword) {
    throw new HttpsError('invalid-argument', 'Reset code and new password are required');
  }

  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }

  try {
    console.log(`Processing password reset confirmation for code: ${resetCode}`);

    // Find and validate the reset code
    const resetQuery = await db.collection('passwordResets')
      .where('resetCode', '==', resetCode)
      .where('used', '==', false)
      .get();

    if (resetQuery.empty) {
      throw new HttpsError('invalid-argument', 'Invalid or already used reset code');
    }

    const resetDoc = resetQuery.docs[0];
    const resetData = resetDoc.data();

    // Check if code has expired (1 hour)
    const now = new Date();
    const expiresAt = resetData.expiresAt.toDate();

    if (now > expiresAt) {
      throw new HttpsError('invalid-argument', 'Reset code has expired');
    }

    // Find the user by email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(resetData.email);
    } catch (error) {
      throw new HttpsError('not-found', 'User not found');
    }

    // Update the user's password using Firebase Admin
    await auth.updateUser(userRecord.uid, {
      password: newPassword
    });

    // Mark the reset code as used
    await resetDoc.ref.update({
      used: true,
      usedAt: new Date()
    });

    console.log(`Password successfully reset for user: ${resetData.email}`);

    return {
      success: true,
      email: resetData.email
    };
  } catch (error) {
    console.error('Error confirming password reset:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Failed to reset password');
  }
}); 