"use strict";
// sendPasswordResetEmail - Unified Password Reset Function
// Replaces: sendPasswordResetV3, sendPasswordReset
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const database_1 = require("../../config/database");
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
            language: request.data.language
        });
        // Validate required data
        if (!request.data.email) {
            throw new Error('Email is required');
        }
        // SECURITY: the reset code MUST be generated server-side. Accepting a
        // client-supplied code lets an attacker pre-choose the code for any
        // email address and take over the account.
        const resetCode = (0, crypto_1.randomBytes)(32).toString('hex');
        // Store reset code in Firestore (matching V3 behavior)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
        await database_1.db.collection('passwordResets').add({
            email: request.data.email,
            resetCode,
            expiresAt,
            used: false,
            createdAt: new Date(),
            userType: request.data.userType || 'B2C'
        });
        console.log('✅ Reset code stored in Firestore with 1 hour expiry');
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
                resetCode,
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