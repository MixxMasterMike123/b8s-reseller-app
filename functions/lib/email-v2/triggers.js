"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderConfirmationEmailsV3 = void 0;
// V3 Email System Firestore Triggers
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const EmailService_1 = require("./EmailService");
const b2cOrderPending_1 = require("./templates/b2cOrderPending");
const adminB2COrderNotification_1 = require("./templates/adminB2COrderNotification");
const b2bOrderConfirmationCustomer_1 = require("./templates/b2bOrderConfirmationCustomer");
const b2bOrderConfirmationAdmin_1 = require("./templates/b2bOrderConfirmationAdmin");
// Initialize Firestore with named database
const db = (0, firestore_2.getFirestore)('b8s-reseller-db');
// Helper function for email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// Helper function to determine user's preferred language
async function getUserPreferredLanguage(email) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.log('No user found, using default language');
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
// V3 Order Confirmation Emails Trigger
exports.sendOrderConfirmationEmailsV3 = (0, firestore_1.onDocumentCreated)({
    document: 'orders/{orderId}',
    database: 'b8s-reseller-db'
}, async (event) => {
    try {
        const orderData = event.data?.data();
        const orderId = event.params?.orderId;
        if (!orderData?.orderNumber || !orderData.items || !orderData.items.length) {
            console.error('Invalid order data:', orderData);
            return;
        }
        console.log(`🚀 V3 Email trigger fired for order ${orderData.orderNumber} (ID: ${orderId})`);
        let customerEmail = '';
        // Handle B2C vs B2B orders
        if (orderData.source === 'b2c') {
            // B2C Order Processing
            customerEmail = orderData.customerInfo?.email || '';
            if (customerEmail && isValidEmail(customerEmail)) {
                console.log(`📧 Processing B2C order confirmation for: ${customerEmail}`);
                // Get user's preferred language
                const preferredLang = await getUserPreferredLanguage(customerEmail);
                // Send customer confirmation email
                const customerTemplate = (0, b2cOrderPending_1.getB2COrderPendingTemplate)({
                    orderData,
                    customerInfo: orderData.customerInfo,
                    orderId
                }, preferredLang);
                const customerMessageId = await sendEmailV3(customerEmail, customerTemplate.subject, customerTemplate.html);
                console.log(`✅ B2C customer confirmation sent to ${customerEmail}, messageId: ${customerMessageId}`);
                // Send admin notification
                const adminTemplate = (0, adminB2COrderNotification_1.getAdminB2COrderNotificationTemplate)({
                    orderData
                }, 'sv-SE');
                const adminEmails = ['micke.ohlen@gmail.com']; // TODO: Make this configurable
                const adminPromises = adminEmails.map(email => sendEmailV3(email, adminTemplate.subject, adminTemplate.html));
                const adminMessageIds = await Promise.all(adminPromises);
                console.log(`✅ B2C admin notifications sent, messageIds: ${adminMessageIds.join(', ')}`);
            }
            else {
                console.log(`❌ Invalid or missing customer email for B2C order: ${customerEmail}`);
            }
        }
        else {
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
            const userData = userDoc.data();
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
                const customerTemplate = (0, b2bOrderConfirmationCustomer_1.getB2BOrderConfirmationCustomerTemplate)({
                    userData,
                    orderData,
                    orderSummary,
                    totalAmount
                }, preferredLang);
                const customerMessageId = await sendEmailV3(customerEmail, customerTemplate.subject, customerTemplate.html);
                console.log(`✅ B2B customer confirmation sent to ${customerEmail}, messageId: ${customerMessageId}`);
                // Send admin notification
                const adminTemplate = (0, b2bOrderConfirmationAdmin_1.getB2BOrderConfirmationAdminTemplate)({
                    userData,
                    orderData,
                    orderSummary,
                    totalAmount
                }, 'sv-SE');
                const adminEmails = ['micke.ohlen@gmail.com']; // TODO: Make this configurable
                const adminPromises = adminEmails.map(email => sendEmailV3(email, adminTemplate.subject, adminTemplate.html));
                const adminMessageIds = await Promise.all(adminPromises);
                console.log(`✅ B2B admin notifications sent, messageIds: ${adminMessageIds.join(', ')}`);
            }
            else {
                console.log(`❌ Invalid or missing customer email for B2B order: ${customerEmail}`);
            }
        }
        console.log(`🎉 Order confirmation emails completed for order ${orderData.orderNumber}`);
    }
    catch (error) {
        console.error(`❌ Error sending V3 confirmation emails for order ${event.params?.orderId}:`, error);
        throw error; // Re-throw to trigger retry mechanism
    }
});
//# sourceMappingURL=triggers.js.map