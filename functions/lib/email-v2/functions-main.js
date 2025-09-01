"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendB2COrderPendingEmailV3 = exports.sendAffiliateWelcomeEmailV3 = exports.sendCustomerWelcomeEmailV3 = void 0;
// Main V3 email functions
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
// import { getAuth } from 'firebase-admin/auth'; // TODO: Will be needed for future functions
const EmailService_1 = require("./EmailService");
const welcomeCredentials_1 = require("./templates/welcomeCredentials");
const affiliateWelcome_1 = require("./templates/affiliateWelcome");
const b2cOrderPending_1 = require("./templates/b2cOrderPending");
// Initialize Firestore with named database and Auth
const db = (0, firestore_1.getFirestore)('b8s-reseller-db');
// const auth = getAuth(); // TODO: Will be needed for future functions
// Helper function for email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// Helper function for admin authentication
async function verifyAdminAuth(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const adminDoc = await db.collection('users').doc(authUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
}
// Helper function to determine user's preferred language
async function getUserPreferredLanguage(email) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.log('No B2C customer found, using default language');
    }
    return preferredLang;
}
// Helper function to send email using V3 system
async function sendEmailV3(to, subject, html) {
    const emailService = EmailService_1.EmailService.getInstance();
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
exports.sendCustomerWelcomeEmailV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendCustomerWelcomeEmailV3: Starting...');
    const { auth: userAuth, data } = request;
    // Verify admin authentication
    await verifyAdminAuth(userAuth?.uid);
    const { customerData, temporaryPassword } = data;
    if (!customerData?.email || !isValidEmail(customerData.email)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid customer email is required');
    }
    if (!temporaryPassword) {
        throw new https_1.HttpsError('invalid-argument', 'Temporary password is required');
    }
    try {
        console.log(`🔍 Processing welcome email for: ${customerData.email}`);
        // Get user's preferred language
        const preferredLang = await getUserPreferredLanguage(customerData.email);
        // Get email template
        const template = (0, welcomeCredentials_1.getWelcomeCredentialsTemplate)({
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
    }
    catch (error) {
        console.error('❌ Welcome email failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send welcome email');
    }
});
// V3 Affiliate Welcome Email Function
exports.sendAffiliateWelcomeEmailV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendAffiliateWelcomeEmailV3: Starting...');
    const { auth: userAuth, data } = request;
    // Verify admin authentication
    await verifyAdminAuth(userAuth?.uid);
    const { appData, affiliateCode, tempPassword, loginInstructions, wasExistingAuthUser } = data;
    if (!appData?.email || !isValidEmail(appData.email)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid affiliate email is required');
    }
    if (!affiliateCode) {
        throw new https_1.HttpsError('invalid-argument', 'Affiliate code is required');
    }
    try {
        console.log(`🔍 Processing affiliate welcome email for: ${appData.email}`);
        // Get user's preferred language
        const preferredLang = await getUserPreferredLanguage(appData.email);
        // Get email template
        const template = (0, affiliateWelcome_1.getAffiliateWelcomeTemplate)({
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
    }
    catch (error) {
        console.error('❌ Affiliate welcome email failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send affiliate welcome email');
    }
});
// V3 B2C Order Pending Email Function
exports.sendB2COrderPendingEmailV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendB2COrderPendingEmailV3: Starting...');
    const { data } = request;
    const { orderData, customerInfo, orderId } = data;
    if (!customerInfo?.email || !isValidEmail(customerInfo.email)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid customer email is required');
    }
    if (!orderData?.orderNumber) {
        throw new https_1.HttpsError('invalid-argument', 'Order data is required');
    }
    try {
        console.log(`🔍 Processing B2C order confirmation for: ${customerInfo.email}`);
        // Get user's preferred language
        const preferredLang = await getUserPreferredLanguage(customerInfo.email);
        // Get email template
        const template = (0, b2cOrderPending_1.getB2COrderPendingTemplate)({
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
    }
    catch (error) {
        console.error('❌ B2C order confirmation failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send order confirmation');
    }
});
// TODO: Add more V3 functions following the same pattern:
// - sendB2COrderNotificationAdminV3
// - sendB2BOrderConfirmationCustomerV3  
// - sendB2BOrderConfirmationAdminV3
// - sendOrderStatusEmailV3
// - sendAffiliateCredentialsV3
// - sendVerificationEmailV3
// - updateCustomerEmailV3
// - approveAffiliateV3
//# sourceMappingURL=functions-main.js.map