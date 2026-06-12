"use strict";
// sendAffiliateApplicationEmails.ts - Send both affiliate and admin emails when application is submitted
// Replaces missing affiliate application notification system
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAffiliateApplicationEmails = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_urls_1 = require("../../config/app-urls");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const config_1 = require("../core/config");
exports.sendAffiliateApplicationEmails = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: app_urls_1.appUrls.CORS_ORIGINS
}, async (request) => {
    try {
        console.log('📧 sendAffiliateApplicationEmails: Starting dual email send');
        console.log('📧 Request data:', {
            applicantName: request.data.applicantInfo.name,
            applicantEmail: request.data.applicantInfo.email,
            applicationId: request.data.applicationId,
            language: request.data.language
        });
        // Validate required data
        if (!request.data.applicantInfo || !request.data.applicationId) {
            throw new Error('Applicant info and application ID are required');
        }
        if (!request.data.applicantInfo.name || !request.data.applicantInfo.email) {
            throw new Error('Applicant name and email are required');
        }
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // 1. Send confirmation email to affiliate applicant
        console.log('📧 Sending confirmation email to applicant...');
        const applicantResult = await orchestrator.sendEmail({
            emailType: 'AFFILIATE_APPLICATION_RECEIVED',
            customerInfo: {
                email: request.data.applicantInfo.email,
                name: request.data.applicantInfo.name
            },
            language: request.data.language || 'sv-SE',
            additionalData: {
                applicantInfo: request.data.applicantInfo,
                applicationId: request.data.applicationId
            },
            adminEmail: false
        });
        if (!applicantResult.success) {
            console.error('❌ Failed to send applicant confirmation email:', applicantResult.error);
            throw new Error(`Failed to send confirmation email: ${applicantResult.error}`);
        }
        // 2. Send notification email to admin
        console.log('📧 Sending notification email to admin...');
        const adminResult = await orchestrator.sendEmail({
            emailType: 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN',
            customerInfo: {
                email: config_1.EMAIL_CONFIG.ADMIN_RECIPIENTS.join(', '),
                name: `${config_1.EMAIL_CONFIG.SMTP.FROM_NAME} Admin`
            },
            language: 'sv-SE',
            additionalData: {
                applicantInfo: request.data.applicantInfo,
                applicationId: request.data.applicationId,
                adminPortalUrl: app_urls_1.appUrls.B2B_PORTAL
            },
            adminEmail: true
        });
        if (!adminResult.success) {
            console.error('❌ Failed to send admin notification email:', adminResult.error);
            // Don't fail the entire operation if admin email fails
            console.log('⚠️ Continuing despite admin email failure');
        }
        console.log('✅ sendAffiliateApplicationEmails: Success');
        return {
            success: true,
            applicantEmailSent: applicantResult.success,
            adminEmailSent: adminResult.success,
            applicantMessageId: applicantResult.messageId,
            adminMessageId: adminResult.messageId,
            details: {
                applicant: applicantResult.details,
                admin: adminResult.details
            }
        };
    }
    catch (error) {
        console.error('❌ sendAffiliateApplicationEmails: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in affiliate application emails');
    }
});
//# sourceMappingURL=sendAffiliateApplicationEmails.js.map