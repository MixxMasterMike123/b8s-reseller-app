"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveAffiliate = exports.testEmail = exports.updateCustomerEmail = exports.sendOrderStatusUpdateEmail = exports.sendUserActivationEmail = exports.sendOrderConfirmationEmails = exports.sendB2COrderPendingEmail = exports.sendB2COrderNotificationAdmin = exports.sendOrderStatusEmail = exports.sendB2BOrderConfirmationCustomer = exports.sendB2BOrderConfirmationAdmin = exports.sendAffiliateWelcomeEmail = exports.sendCustomerWelcomeEmail = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const app_urls_1 = require("../config/app-urls");
const email_handler_1 = require("./email-handler");
const emails_1 = require("../../emails");
// Get Firebase Auth from already initialized app
const auth = (0, auth_1.getAuth)((0, app_1.getApp)());
// Helper function to create email data
function createEmailData(to, from, template, params) {
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
async function generateTemporaryPassword() {
    try {
        // Use DinoPass API for strong password generation
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const response = await fetch('http://www.dinopass.com/password/strong');
        if (response.ok) {
            const password = await response.text();
            return password.trim();
        }
        else {
            throw new Error('DinoPass API request failed');
        }
    }
    catch (error) {
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
exports.sendCustomerWelcomeEmail = (0, https_1.onCall)(async (request) => {
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
        const customerDoc = await email_handler_1.db.collection('users').doc(customerId).get();
        if (!customerDoc.exists) {
            throw new Error('Customer not found');
        }
        const customerData = customerDoc.data();
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
        }
        catch (error) {
            if (error.code === 'auth/email-already-exists') {
                // If user exists, update their password
                const existingUser = await auth.getUserByEmail(customerData.email);
                await auth.updateUser(existingUser.uid, {
                    password: temporaryPassword
                });
                userRecord = existingUser;
                isExistingUser = true;
                console.log(`Updated existing user password for ${customerData.email}`);
            }
            else {
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
            temporaryPassword,
            credentialsHistory: firestore_2.FieldValue.arrayUnion({
                sentAt: new Date(),
                sentBy: userAuth.uid,
                isResend: isExistingUser
            })
        });
        // Send welcome email using existing template
        const emailTemplate = (0, emails_1.getEmail)('welcomeCredentials', customerData.preferredLang || 'sv-SE', {
            customerData,
            temporaryPassword,
            wasExistingAuthUser: isExistingUser
        });
        const emailData = createEmailData(customerData.email, email_handler_1.EMAIL_FROM.system, emailTemplate, {
            userData: {
                email: customerData.email,
                companyName: customerData.companyName,
                contactPerson: customerData.contactPerson,
                preferredLang: customerData.preferredLang
            },
            tempPassword: temporaryPassword,
            wasExistingAuthUser: isExistingUser
        });
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`${isExistingUser ? 'New credentials' : 'Welcome email'} sent successfully to ${customerData.email} for customer ${customerId}${isExistingUser ? ' (existing user)' : ''}`);
        return {
            success: true,
            isExistingUser,
            temporaryPassword,
            email: customerData.email
        };
    }
    catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
});
// Send affiliate welcome email with credentials
exports.sendAffiliateWelcomeEmail = (0, https_1.onCall)(async (request) => {
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
        const emailTemplate = (0, emails_1.getEmail)('affiliateWelcome', affiliateData.preferredLang || 'sv-SE', {
            affiliateData,
            temporaryPassword,
            wasExistingAuthUser: affiliateData.wasExistingAuthUser || false
        });
        const emailData = createEmailData(affiliateData.email, email_handler_1.EMAIL_FROM.affiliate, emailTemplate, {
            userData: {
                email: affiliateData.email,
                companyName: affiliateData.name || '',
                preferredLang: affiliateData.preferredLang
            },
            affiliateData,
            tempPassword: temporaryPassword,
            wasExistingAuthUser: affiliateData.wasExistingAuthUser
        });
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`${affiliateData.wasExistingAuthUser ? 'New credentials' : 'Welcome email'} sent successfully to affiliate ${affiliateData.email}`);
        return {
            success: true,
            wasExistingAuthUser: affiliateData.wasExistingAuthUser || false,
            email: affiliateData.email
        };
    }
    catch (error) {
        console.error('Error sending affiliate welcome email:', error);
        throw new Error('Failed to send affiliate welcome email');
    }
});
// Send B2B order confirmation to admin
exports.sendB2BOrderConfirmationAdmin = (0, https_1.onCall)(async (request) => {
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
        const templateParams = {
            userData,
            orderData,
            orderSummary,
            totalAmount
        };
        const emailTemplate = (0, emails_1.getEmail)('b2bOrderConfirmationAdmin', 'sv-SE', templateParams);
        const emailData = createEmailData(email_handler_1.EMAIL_FROM.system, email_handler_1.EMAIL_FROM.system, emailTemplate, templateParams);
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`B2B order confirmation sent to admin for order ${orderData.orderNumber}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error sending B2B order confirmation to admin:', error);
        throw new Error('Failed to send order confirmation to admin');
    }
});
// Send B2B order confirmation to customer
exports.sendB2BOrderConfirmationCustomer = (0, https_1.onCall)(async (request) => {
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
        const templateParams = {
            userData,
            orderData,
            orderSummary,
            totalAmount
        };
        const emailTemplate = (0, emails_1.getEmail)('b2bOrderConfirmationCustomer', userData.preferredLang || 'sv-SE', templateParams);
        const emailData = createEmailData(userData.email, email_handler_1.EMAIL_FROM.system, emailTemplate, templateParams);
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`B2B order confirmation sent to customer ${userData.email} for order ${orderData.orderNumber}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error sending B2B order confirmation to customer:', error);
        throw new Error('Failed to send order confirmation to customer');
    }
});
// Send order status update email
exports.sendOrderStatusEmail = (0, https_1.onCall)(async (request) => {
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
        const templateParams = {
            userData,
            orderData
        };
        const emailTemplate = (0, emails_1.getEmail)(templateName, userData.preferredLang || 'sv-SE', templateParams);
        const emailData = createEmailData(userData.email, email_handler_1.EMAIL_FROM.system, emailTemplate, templateParams);
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`Order ${status} email sent to ${userData.email} for order ${orderData.orderNumber}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error sending order status email:', error);
        throw new Error('Failed to send order status email');
    }
});
// Send B2C order notification to admin
exports.sendB2COrderNotificationAdmin = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth, data } = request;
    if (!userAuth?.uid) {
        throw new Error('Unauthorized');
    }
    try {
        const { orderData, customerInfo, lang } = data;
        if (!orderData || !customerInfo) {
            throw new Error('Order data and customer info are required');
        }
        const emailTemplate = (0, emails_1.getEmail)('adminB2COrderNotification', lang || 'sv-SE', {
            orderData,
            customerInfo
        });
        const emailData = createEmailData(email_handler_1.EMAIL_FROM.system, email_handler_1.EMAIL_FROM.system, emailTemplate, {
            orderData,
            userData: {
                email: customerInfo.email,
                companyName: customerInfo.firstName + ' ' + (customerInfo.lastName || '')
            },
            customerInfo
        });
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`B2C order notification sent to admin for order ${orderData.orderNumber}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error sending B2C order notification to admin:', error);
        throw new Error('Failed to send B2C order notification to admin');
    }
});
// Send B2C order confirmation to customer
exports.sendB2COrderPendingEmail = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth, data } = request;
    if (!userAuth?.uid) {
        throw new Error('Unauthorized');
    }
    try {
        const { orderData, customerInfo, lang } = data;
        if (!orderData || !customerInfo) {
            throw new Error('Order data and customer info are required');
        }
        const emailTemplate = (0, emails_1.getEmail)('b2cOrderPending', lang || 'sv-SE', {
            orderData,
            customerInfo
        });
        const emailData = createEmailData(customerInfo.email, email_handler_1.EMAIL_FROM.system, emailTemplate, {
            orderData,
            userData: {
                email: customerInfo.email,
                companyName: customerInfo.firstName + ' ' + (customerInfo.lastName || '')
            },
            customerInfo
        });
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`B2C order confirmation sent to customer ${customerInfo.email} for order ${orderData.orderNumber}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error sending B2C order confirmation to customer:', error);
        throw new Error('Failed to send B2C order confirmation to customer');
    }
});
// Error handling helper
function handleError(error) {
    if (error instanceof Error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
    throw new functions.https.HttpsError('internal', 'An unknown error occurred');
}
// Send order confirmation emails on order creation
exports.sendOrderConfirmationEmails = (0, firestore_1.onDocumentCreated)('orders/{orderId}', async (event) => {
    try {
        const orderData = event.data?.data();
        if (!orderData?.orderNumber || !orderData.items || !orderData.items.length) {
            console.error('Invalid order data:', orderData);
            return;
        }
        // Get user data
        const userDoc = orderData.userId ? await email_handler_1.db.collection('users').doc(orderData.userId).get() : null;
        const userData = userDoc?.data();
        if (!userData?.email) {
            console.error('User data not found for order:', orderData.orderNumber);
            return;
        }
        // Send confirmation emails
        const emailTemplate = (0, emails_1.getEmail)('orderConfirmed', userData.preferredLang || 'sv-SE', {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        const emailData = createEmailData(userData.email, email_handler_1.EMAIL_FROM.system, emailTemplate, {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        await (0, email_handler_1.sendEmail)(emailData);
        // Send admin notification
        const adminTemplate = (0, emails_1.getEmail)('orderConfirmed', 'sv-SE', {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        const adminEmailData = createEmailData('info@b8shield.com', email_handler_1.EMAIL_FROM.system, adminTemplate, {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        await (0, email_handler_1.sendEmail)(adminEmailData);
    }
    catch (error) {
        handleError(error);
    }
});
// Send email when user is activated
exports.sendUserActivationEmail = (0, firestore_1.onDocumentUpdated)('users/{userId}', async (event) => {
    try {
        const beforeData = event.data?.before.data();
        const afterData = event.data?.after.data();
        const userId = event.params.userId;
        // Check if user was activated
        if (!beforeData.isActive && afterData.isActive) {
            const email = {
                from: email_handler_1.EMAIL_FROM.system,
                to: afterData.email,
                subject: "Ditt B8Shield-konto är nu aktivt",
                text: `
          Hej ${afterData.contactPerson},
          
          Ditt B8Shield-konto för ${afterData.companyName} har aktiverats!
          
          Du kan nu logga in med ditt användarnamn och lösenord på:
          ${app_urls_1.appUrls.B2B_PORTAL}
          
          Om du har några frågor, kontakta vår support.
          
          Med vänliga hälsningar,
          B8Shield Team
        `,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${app_urls_1.appUrls.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
            </div>
            <h2>Hej ${afterData.contactPerson},</h2>
            
            <p>Ditt B8Shield-konto för <strong>${afterData.companyName}</strong> har aktiverats!</p>
            
            <p>Du kan nu logga in med ditt användarnamn och lösenord på:<br>
            <a href="${app_urls_1.appUrls.B2B_PORTAL}">B8Shield Portal</a></p>
            
            <p>Om du har några frågor, kontakta vår support.</p>
            
            <p>Med vänliga hälsningar,<br>B8Shield Team</p>
          </div>
        `,
            };
            await (0, email_handler_1.sendEmail)(email);
            console.log(`Activation email sent to user ${userId}`);
        }
        return null;
    }
    catch (error) {
        console.error("Error sending user activation email:", error);
        return null;
    }
});
// Send order status update emails
exports.sendOrderStatusUpdateEmail = (0, firestore_1.onDocumentUpdated)('orders/{orderId}', async (event) => {
    try {
        const beforeData = event.data?.before.data();
        const afterData = event.data?.after.data();
        const orderId = event.params.orderId;
        // Check if status changed and userId exists
        if (beforeData.status !== afterData.status && afterData.userId) {
            // Get user data
            const userSnapshot = await email_handler_1.db
                .collection("users")
                .doc(afterData.userId)
                .get();
            if (!userSnapshot.exists) {
                console.error(`User ${afterData.userId} not found for order ${orderId}`);
                return null;
            }
            const userData = userSnapshot.data();
            const templateParams = {
                userData,
                orderData: afterData,
                status: afterData.status
            };
            const template = (0, emails_1.getEmail)('orderStatusUpdate', userData.preferredLang || 'sv-SE', templateParams);
            // Email to user
            const emailData = createEmailData(userData.email, afterData.source === 'b2c' ? email_handler_1.EMAIL_FROM.system : email_handler_1.EMAIL_FROM.system, template, templateParams);
            // Send email to user
            await (0, email_handler_1.sendEmail)(emailData);
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
                <img src="${app_urls_1.appUrls.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
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
                const adminEmailData = createEmailData("micke.ohlen@gmail.com", email_handler_1.EMAIL_FROM.system, adminTemplate, {
                    orderData: afterData,
                    userData
                });
                await (0, email_handler_1.sendEmail)(adminEmailData);
            }
            console.log(`Status update email sent for order ${orderId}: ${beforeData.status} -> ${afterData.status}`);
        }
        return null;
    }
    catch (error) {
        console.error("Error sending order status update email:", error);
        return null;
    }
});
// Update customer email (admin only)
exports.updateCustomerEmail = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth } = request;
    if (!userAuth?.uid) {
        throw new Error('Måste vara inloggad');
    }
    // Get admin status from named database
    const callerDoc = await email_handler_1.db.collection('users').doc(userAuth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
        throw new Error('Måste vara administratör');
    }
    const { userId, newEmail } = request.data;
    try {
        // Get customer data from Firestore
        const customerDoc = await email_handler_1.db.collection('users').doc(userId).get();
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
        }
        catch (authError) {
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
                await email_handler_1.db.collection('users').doc(userId).update({
                    firebaseAuthUid: authUser.uid,
                    updatedAt: firestore_2.FieldValue.serverTimestamp()
                });
            }
            else {
                throw authError;
            }
        }
        // Update email in Firestore
        await email_handler_1.db.collection('users').doc(userId).update({
            email: newEmail,
            updatedAt: firestore_2.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            message: 'E-post uppdaterad framgångsrikt',
            authAccountCreated: !authUser.uid // true if we created a new account
        };
    }
    catch (error) {
        console.error('Error updating user email:', error);
        if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
            throw new Error(`Firebase Auth fel: ${error.message}`);
        }
        throw new Error('Ett fel uppstod vid uppdatering av e-post');
    }
});
// Test email endpoint
exports.testEmail = (0, https_1.onRequest)(async (req, res) => {
    try {
        console.log('Testing email functionality...');
        const testEmailTemplate = {
            subject: "Test Email from B8Shield Portal",
            text: "This is a test email to verify Gmail SMTP integration is working.",
            html: "<h2>Test Email</h2><p>This is a test email to verify Gmail SMTP integration is working.</p>"
        };
        const emailData = createEmailData("micke.ohlen@gmail.com", `"B8Shield Test" <info@b8shield.com>`, testEmailTemplate, {});
        await (0, email_handler_1.sendEmail)(emailData);
        console.log('Test email sent successfully');
        res.status(200).json({
            success: true,
            message: 'Test email sent successfully',
            config: {
                service: 'gmail',
                from_email: 'b8shield.reseller@gmail.com'
            }
        });
    }
    catch (error) {
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
// Approve affiliate application and send welcome email
exports.approveAffiliate = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth } = request;
    if (!userAuth?.uid) {
        throw new Error('Unauthorized');
    }
    const adminUserDoc = await email_handler_1.db.collection('users').doc(userAuth.uid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'admin') {
        throw new Error('Unauthorized - Admin only');
    }
    const { applicationId, checkoutDiscount, name, email, phone, address, postalCode, city, country, socials, promotionMethod, message } = request.data;
    if (!applicationId) {
        throw new Error('Application ID is required');
    }
    try {
        const applicationRef = email_handler_1.db.collection('affiliateApplications').doc(applicationId);
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
        }
        catch (error) {
            if (error.code === 'auth/email-already-exists') {
                authUser = await auth.getUserByEmail(appData.email);
                wasExistingAuthUser = true;
                console.log(`User with email ${appData.email} already exists. Using existing auth UID.`);
            }
            else {
                throw error;
            }
        }
        // Generate affiliate code
        const namePart = appData.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
        const randomPart = Math.floor(100 + Math.random() * 900);
        const affiliateCode = `${namePart}-${randomPart}`;
        // Create affiliate record
        const affiliateRef = email_handler_1.db.collection('affiliates').doc(authUser.uid);
        const newAffiliateData = {
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
            createdAt: new Date(),
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
        const emailTemplate = (0, emails_1.getEmail)('affiliateWelcome', appData.preferredLang || 'sv-SE', {
            appData,
            affiliateCode,
            tempPassword,
            loginInstructions,
            wasExistingAuthUser
        });
        const emailData = {
            to: appData.email,
            from: email_handler_1.EMAIL_FROM.affiliate,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            appData: {
                name: appData.name,
                email: appData.email,
                preferredLang: appData.preferredLang
            }
        };
        await (0, email_handler_1.sendEmail)(emailData);
        console.log(`Welcome email sent successfully to affiliate ${appData.email}`);
        return {
            success: true,
            affiliateCode,
            wasExistingAuthUser
        };
    }
    catch (error) {
        console.error('Error approving affiliate:', error);
        throw new Error('Failed to approve affiliate');
    }
});
//# sourceMappingURL=functions.js.map