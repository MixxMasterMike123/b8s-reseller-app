"use strict";
// sendOrderStatusUpdateEmail - Unified Order Status Update Function  
// Replaces: sendOrderStatusEmailV3, sendOrderStatusEmail, sendStatusUpdateHttp
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderStatusUpdateEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendOrderStatusUpdateEmail = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        console.log('📧 sendOrderStatusUpdateEmail: Starting unified status update');
        console.log('📧 Request data:', {
            orderNumber: request.data.orderData.orderNumber,
            newStatus: request.data.newStatus,
            previousStatus: request.data.previousStatus,
            userEmail: request.data.userData.email,
            userId: request.data.userId,
            b2cCustomerId: request.data.b2cCustomerId
        });
        // Validate required data
        if (!request.data.orderData?.orderNumber) {
            throw new Error('Order number is required');
        }
        if (!request.data.userData?.email) {
            throw new Error('User email is required');
        }
        if (!request.data.newStatus) {
            throw new Error('New status is required');
        }
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // Prepare context for orchestrator
        const emailContext = {
            emailType: 'ORDER_STATUS_UPDATE',
            userId: request.data.userId,
            b2cCustomerId: request.data.b2cCustomerId,
            customerInfo: {
                email: request.data.userData.email,
                name: request.data.userData.contactPerson || request.data.userData.companyName
            },
            orderId: request.data.orderId,
            language: request.data.language,
            orderData: request.data.orderData,
            additionalData: {
                newStatus: request.data.newStatus,
                previousStatus: request.data.previousStatus,
                trackingNumber: request.data.trackingNumber,
                estimatedDelivery: request.data.estimatedDelivery,
                notes: request.data.notes
            },
            adminEmail: false
        };
        // Send email via orchestrator
        const result = await orchestrator.sendEmail(emailContext);
        if (result.success) {
            console.log('✅ sendOrderStatusUpdateEmail: Success');
            return {
                success: true,
                messageId: result.messageId,
                details: result.details
            };
        }
        else {
            console.error('❌ sendOrderStatusUpdateEmail: Failed:', result.error);
            throw new Error(result.error || 'Status update email sending failed');
        }
    }
    catch (error) {
        console.error('❌ sendOrderStatusUpdateEmail: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in status update email');
    }
});
//# sourceMappingURL=sendOrderStatusUpdateEmail.js.map