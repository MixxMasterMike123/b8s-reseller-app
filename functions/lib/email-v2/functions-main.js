"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendB2BOrderConfirmationAdminV3 = exports.sendOrderStatusEmailV3 = exports.sendB2BOrderConfirmationCustomerV3 = exports.sendB2COrderNotificationAdminV3 = exports.sendB2COrderPendingEmailV3 = exports.sendAffiliateWelcomeEmailV3 = exports.sendCustomerWelcomeEmailV3 = void 0;
// Main V3 email functions
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
// import { getAuth } from 'firebase-admin/auth'; // TODO: Will be needed for future functions
const EmailService_1 = require("./EmailService");
const welcomeCredentials_1 = require("./templates/welcomeCredentials");
const affiliateWelcome_1 = require("./templates/affiliateWelcome");
const b2cOrderPending_1 = require("./templates/b2cOrderPending");
const adminB2COrderNotification_1 = require("./templates/adminB2COrderNotification");
const b2bOrderConfirmationCustomer_1 = require("./templates/b2bOrderConfirmationCustomer");
const orderStatusUpdate_1 = require("./templates/orderStatusUpdate");
const b2bOrderConfirmationAdmin_1 = require("./templates/b2bOrderConfirmationAdmin");
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
// V3 Admin B2C Order Notification Function
exports.sendB2COrderNotificationAdminV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendB2COrderNotificationAdminV3: Starting...');
    const { data } = request;
    const { orderData } = data;
    if (!orderData?.orderNumber) {
        throw new https_1.HttpsError('invalid-argument', 'Order data is required');
    }
    try {
        console.log(`🔍 Processing admin B2C notification for order: ${orderData.orderNumber}`);
        // Admin emails are always in Swedish
        const preferredLang = 'sv-SE';
        // Get email template
        const template = (0, adminB2COrderNotification_1.getAdminB2COrderNotificationTemplate)({
            orderData
        }, preferredLang);
        // Send to all admin emails (hardcoded for now, could be made configurable)
        const adminEmails = ['micke.ohlen@gmail.com']; // TODO: Make this configurable
        const emailPromises = adminEmails.map(email => sendEmailV3(email, template.subject, template.html));
        const messageIds = await Promise.all(emailPromises);
        console.log(`✅ Admin B2C notification sent successfully for order: ${orderData.orderNumber}`);
        return {
            success: true,
            orderNumber: orderData.orderNumber,
            language: preferredLang,
            messageIds
        };
    }
    catch (error) {
        console.error('❌ Admin B2C notification failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send admin notification');
    }
});
// V3 B2B Order Confirmation Customer Function
exports.sendB2BOrderConfirmationCustomerV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendB2BOrderConfirmationCustomerV3: Starting...');
    const { data } = request;
    const { userData, orderData, orderSummary, totalAmount } = data;
    if (!userData?.email || !isValidEmail(userData.email)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid customer email is required');
    }
    if (!orderData?.orderNumber) {
        throw new https_1.HttpsError('invalid-argument', 'Order data is required');
    }
    try {
        console.log(`🔍 Processing B2B order confirmation for: ${userData.email}`);
        // Get user's preferred language
        const preferredLang = await getUserPreferredLanguage(userData.email);
        // Get email template
        const template = (0, b2bOrderConfirmationCustomer_1.getB2BOrderConfirmationCustomerTemplate)({
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
    }
    catch (error) {
        console.error('❌ B2B order confirmation failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send order confirmation');
    }
});
// V3 Order Status Update Function
exports.sendOrderStatusEmailV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendOrderStatusEmailV3: Starting...');
    const { data } = request;
    const { orderData, userData, newStatus, previousStatus, trackingNumber, estimatedDelivery, notes } = data;
    if (!userData?.email || !isValidEmail(userData.email)) {
        throw new https_1.HttpsError('invalid-argument', 'Valid customer email is required');
    }
    if (!orderData?.orderNumber || !newStatus) {
        throw new https_1.HttpsError('invalid-argument', 'Order data and new status are required');
    }
    try {
        console.log(`🔍 Processing order status update for: ${userData.email} - ${orderData.orderNumber} → ${newStatus}`);
        // Get user's preferred language
        const preferredLang = await getUserPreferredLanguage(userData.email);
        // Get email template
        const template = (0, orderStatusUpdate_1.getOrderStatusUpdateTemplate)({
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
    }
    catch (error) {
        console.error('❌ Order status update failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send order status update');
    }
});
// V3 B2B Order Confirmation Admin Function
exports.sendB2BOrderConfirmationAdminV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendB2BOrderConfirmationAdminV3: Starting...');
    const { data } = request;
    const { userData, orderData, orderSummary, totalAmount } = data;
    if (!orderData?.orderNumber) {
        throw new https_1.HttpsError('invalid-argument', 'Order data is required');
    }
    try {
        console.log(`🔍 Processing admin B2B notification for order: ${orderData.orderNumber}`);
        // Admin emails are always in Swedish
        const preferredLang = 'sv-SE';
        // Get email template
        const template = (0, b2bOrderConfirmationAdmin_1.getB2BOrderConfirmationAdminTemplate)({
            userData, orderData, orderSummary, totalAmount
        }, preferredLang);
        // Send to all admin emails
        const adminEmails = ['micke.ohlen@gmail.com']; // TODO: Make this configurable
        const emailPromises = adminEmails.map(email => sendEmailV3(email, template.subject, template.html));
        const messageIds = await Promise.all(emailPromises);
        console.log(`✅ Admin B2B notification sent successfully for order: ${orderData.orderNumber}`);
        return {
            success: true,
            orderNumber: orderData.orderNumber,
            language: preferredLang,
            messageIds
        };
    }
    catch (error) {
        console.error('❌ Admin B2B notification failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send admin notification');
    }
});
// TODO: Add remaining 3 V3 functions:
// - sendAffiliateCredentialsV3
// - sendVerificationEmailV3  
// - approveAffiliateV3
//# sourceMappingURL=functions-main.js.map