"use strict";
// sendOrderNotificationAdmin - Unified Admin Order Notification Function
// Replaces: sendB2COrderNotificationAdminV3, sendB2BOrderConfirmationAdminV3
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderNotificationAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_urls_1 = require("../../config/app-urls");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const authGuard_1 = require("./authGuard");
const database_1 = require("../../config/database");
exports.sendOrderNotificationAdmin = (0, https_1.onCall)({
    region: 'us-central1',
    secrets: ['RESEND_API_KEY'],
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: app_urls_1.appUrls.CORS_ORIGINS
}, async (request) => {
    try {
        // SECURITY: privileged mailer - basic auth gate; full shop-parity check
        // happens AFTER the order is loaded server-side (the order doc's own
        // shopId is the trustworthy source). Admin-SDK bypasses Firestore rules.
        (0, authGuard_1.requireAuth)(request.auth?.uid);
        console.log('📧 sendOrderNotificationAdmin: Starting admin order notification');
        console.log('📧 Request data:', {
            orderNumber: request.data.orderData.orderNumber,
            userId: request.data.userId,
            b2cCustomerId: request.data.b2cCustomerId,
            source: request.data.source,
            adminEmail: request.data.adminEmail
        });
        // Validate required data
        if (!request.data.orderData?.orderNumber) {
            throw new Error('Order number is required');
        }
        if (!request.data.orderId) {
            throw new Error('Order ID is required');
        }
        // TENANT ISOLATION: load the order server-side and enforce shop parity
        // against the order's OWN shopId (trustworthy source) — a shop admin may
        // only send notifications for their own shop's orders; platform may send
        // for any.
        const orderSnap = await database_1.db.collection('orders').doc(request.data.orderId).get();
        if (!orderSnap.exists) {
            throw new Error('Order not found');
        }
        const orderData = orderSnap.data();
        await (0, authGuard_1.requireAdminOfShop)(orderData?.shopId, request.auth?.uid);
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // Send admin notification email via orchestrator
        const result = await orchestrator.sendEmail({
            emailType: 'ORDER_NOTIFICATION_ADMIN',
            userId: request.data.userId,
            b2cCustomerId: request.data.b2cCustomerId,
            customerInfo: request.data.orderData.customerInfo,
            orderId: request.data.orderId,
            source: request.data.source,
            language: request.data.language || 'sv-SE',
            orderData: request.data.orderData,
            additionalData: {
                orderSummary: request.data.orderSummary,
                adminEmail: request.data.adminEmail
            },
            adminEmail: true // This is an admin email
        });
        if (result.success) {
            console.log('✅ sendOrderNotificationAdmin: Success');
            return {
                success: true,
                messageId: result.messageId,
                details: result.details
            };
        }
        else {
            console.error('❌ sendOrderNotificationAdmin: Failed:', result.error);
            throw new Error(result.error || 'Admin email sending failed');
        }
    }
    catch (error) {
        console.error('❌ sendOrderNotificationAdmin: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in admin notification email');
    }
});
//# sourceMappingURL=sendOrderNotificationAdmin.js.map