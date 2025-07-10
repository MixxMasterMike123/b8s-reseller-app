"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderConfirmationEmails = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const shared_utils_1 = require("../shared-utils");
// Send order confirmation emails on order creation
exports.sendOrderConfirmationEmails = (0, firestore_1.onDocumentCreated)('orders/{orderId}', async (event) => {
    try {
        const orderData = event.data?.data();
        if (!orderData?.orderNumber || !orderData.items || !orderData.items.length) {
            console.error('Invalid order data:', orderData);
            return;
        }
        // Get user data
        const userDoc = orderData.userId ? await shared_utils_1.db.collection('users').doc(orderData.userId).get() : null;
        const userData = userDoc?.data();
        if (!userData?.email) {
            console.error('User data not found for order:', orderData.orderNumber);
            return;
        }
        // Send confirmation emails
        const emailTemplate = (0, shared_utils_1.getEmail)('orderConfirmed', userData.preferredLang || 'sv-SE', {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        const emailData = (0, shared_utils_1.createEmailData)(userData.email, shared_utils_1.EMAIL_FROM.system, emailTemplate, {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        await (0, shared_utils_1.sendEmail)(emailData);
        // Send admin notification
        const adminTemplate = (0, shared_utils_1.getEmail)('orderConfirmed', 'sv-SE', {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        const adminEmailData = (0, shared_utils_1.createEmailData)('info@b8shield.com', shared_utils_1.EMAIL_FROM.system, adminTemplate, {
            orderData,
            userData,
            customerInfo: orderData.customerInfo
        });
        await (0, shared_utils_1.sendEmail)(adminEmailData);
    }
    catch (error) {
        (0, shared_utils_1.handleError)(error);
    }
});
//# sourceMappingURL=sendOrderConfirmationEmails.js.map