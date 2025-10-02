"use strict";
// sendOrderConfirmationEmail - Unified Order Confirmation Function
// Replaces: sendB2COrderPendingEmailV3, sendB2BOrderConfirmationCustomerV3
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderConfirmationEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendOrderConfirmationEmail = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        console.log('📧 sendOrderConfirmationEmail: Starting unified order confirmation');
        console.log('📧 Request data:', {
            orderNumber: request.data.orderData.orderNumber,
            customerEmail: request.data.customerInfo.email,
            userId: request.data.userId,
            b2cCustomerId: request.data.b2cCustomerId,
            source: request.data.source
        });
        // Validate required data
        if (!request.data.orderData?.orderNumber) {
            throw new Error('Order number is required');
        }
        if (!request.data.customerInfo?.email) {
            throw new Error('Customer email is required');
        }
        if (!request.data.orderId) {
            throw new Error('Order ID is required');
        }
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // Send email via orchestrator
        const result = await orchestrator.sendEmail({
            emailType: 'ORDER_CONFIRMATION',
            userId: request.data.userId,
            b2cCustomerId: request.data.b2cCustomerId,
            customerInfo: request.data.customerInfo,
            orderId: request.data.orderId,
            source: request.data.source,
            language: request.data.language,
            orderData: request.data.orderData,
            adminEmail: false
        });
        if (result.success) {
            console.log('✅ sendOrderConfirmationEmail: Success');
            return {
                success: true,
                messageId: result.messageId,
                details: result.details
            };
        }
        else {
            console.error('❌ sendOrderConfirmationEmail: Failed:', result.error);
            throw new Error(result.error || 'Email sending failed');
        }
    }
    catch (error) {
        console.error('❌ sendOrderConfirmationEmail: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in order confirmation email');
    }
});
//# sourceMappingURL=sendOrderConfirmationEmail.js.map