"use strict";
// sendPasswordResetEmail - Unified Password Reset Function
// Replaces: sendPasswordResetV3, sendPasswordReset
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendPasswordResetEmail = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        console.log('📧 sendPasswordResetEmail: Starting unified password reset');
        console.log('📧 Request data:', {
            email: request.data.email,
            userType: request.data.userType,
            language: request.data.language,
            hasResetCode: !!request.data.resetCode
        });
        // Validate required data
        if (!request.data.email) {
            throw new Error('Email is required');
        }
        if (!request.data.resetCode) {
            throw new Error('Reset code is required');
        }
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // Send password reset email via orchestrator
        const result = await orchestrator.sendEmail({
            emailType: 'PASSWORD_RESET',
            customerInfo: {
                email: request.data.email
            },
            language: request.data.language || 'sv-SE',
            additionalData: {
                resetCode: request.data.resetCode,
                userAgent: request.data.userAgent,
                timestamp: request.data.timestamp,
                userType: request.data.userType || 'B2C'
            },
            adminEmail: false
        });
        if (result.success) {
            console.log('✅ sendPasswordResetEmail: Success');
            return {
                success: true,
                messageId: result.messageId,
                details: result.details
            };
        }
        else {
            console.error('❌ sendPasswordResetEmail: Failed:', result.error);
            throw new Error(result.error || 'Password reset email sending failed');
        }
    }
    catch (error) {
        console.error('❌ sendPasswordResetEmail: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in password reset email');
    }
});
//# sourceMappingURL=sendPasswordResetEmail.js.map