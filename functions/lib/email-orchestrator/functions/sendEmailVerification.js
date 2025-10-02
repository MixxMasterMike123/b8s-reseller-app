"use strict";
// sendEmailVerification - Custom B2C Email Verification Function
// Replaces: Firebase's default sendEmailVerification() with custom branded template
// Used for: B2C customer email verification during registration/checkout
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailVerification = void 0;
const https_1 = require("firebase-functions/v2/https");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendEmailVerification = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        console.log('📧 sendEmailVerification: Starting custom B2C email verification');
        console.log('📧 Request data:', {
            customerEmail: request.data.customerInfo.email,
            customerName: request.data.customerInfo.firstName || request.data.customerInfo.name,
            source: request.data.source,
            language: request.data.language
        });
        // Validate required data
        if (!request.data.customerInfo?.email) {
            throw new Error('Customer email is required');
        }
        if (!request.data.verificationCode) {
            throw new Error('Verification code is required');
        }
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // Determine language
        const language = request.data.language || request.data.customerInfo.preferredLang || 'sv-SE';
        // Send email via orchestrator
        const result = await orchestrator.sendEmail({
            emailType: 'EMAIL_VERIFICATION',
            customerInfo: {
                email: request.data.customerInfo.email,
                firstName: request.data.customerInfo.firstName,
                lastName: request.data.customerInfo.lastName,
                name: request.data.customerInfo.name
            },
            language: language,
            additionalData: {
                verificationCode: request.data.verificationCode,
                source: request.data.source || 'registration'
            }
        });
        if (result.success) {
            console.log('✅ sendEmailVerification: Success - Custom verification email sent');
            return {
                success: true,
                messageId: result.messageId,
                details: result.details,
                email: request.data.customerInfo.email,
                source: request.data.source,
                language: language
            };
        }
        else {
            console.error('❌ sendEmailVerification: Failed:', result.error);
            throw new Error(result.error || 'Email verification sending failed');
        }
    }
    catch (error) {
        console.error('❌ sendEmailVerification: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in email verification');
    }
});
//# sourceMappingURL=sendEmailVerification.js.map