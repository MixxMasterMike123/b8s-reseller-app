"use strict";
// sendOrderNotificationAdmin - Unified Admin Order Notification Function
// Replaces: sendB2COrderNotificationAdminV3, sendB2BOrderConfirmationAdminV3
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderNotificationAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const authGuard_1 = require("./authGuard");
exports.sendOrderNotificationAdmin = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        // SECURITY: privileged mailer - admin only
        await (0, authGuard_1.requireAdmin)(request.auth?.uid);
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