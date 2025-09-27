"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendB2BApplicationEmails = void 0;
const https_1 = require("firebase-functions/v2/https");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendB2BApplicationEmails = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        console.log('📧 sendB2BApplicationEmails: Starting dual email send');
        console.log('📧 Request data:', {
            applicantName: request.data.applicantInfo.name,
            applicantEmail: request.data.applicantInfo.email,
            companyName: request.data.applicantInfo.companyName,
            applicationId: request.data.applicationId,
            language: request.data.language
        });
        // Validate required data
        if (!request.data.applicantInfo || !request.data.applicationId) {
            throw new Error('Applicant info and application ID are required');
        }
        if (!request.data.applicantInfo.email || !request.data.applicantInfo.companyName) {
            throw new Error('Applicant email and company name are required');
        }
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // 1. Send confirmation email to B2B applicant
        console.log('📧 Sending confirmation email to B2B applicant...');
        const applicantResult = await orchestrator.sendEmail({
            emailType: 'B2B_APPLICATION_RECEIVED',
            customerInfo: {
                email: request.data.applicantInfo.email,
                name: request.data.applicantInfo.name || request.data.applicantInfo.contactPerson,
                companyName: request.data.applicantInfo.companyName,
                contactPerson: request.data.applicantInfo.contactPerson
            },
            language: request.data.language || 'sv-SE',
            additionalData: {
                applicantInfo: request.data.applicantInfo,
                applicationId: request.data.applicationId
            },
            adminEmail: false
        });
        if (!applicantResult.success) {
            console.error('❌ Failed to send B2B applicant confirmation email:', applicantResult.error);
            throw new Error(`Failed to send confirmation email: ${applicantResult.error}`);
        }
        // 2. Send notification email to admin
        console.log('📧 Sending notification email to admin...');
        const adminResult = await orchestrator.sendEmail({
            emailType: 'B2B_APPLICATION_NOTIFICATION_ADMIN',
            customerInfo: {
                email: request.data.applicantInfo.email,
                name: request.data.applicantInfo.name || request.data.applicantInfo.contactPerson,
                companyName: request.data.applicantInfo.companyName,
                contactPerson: request.data.applicantInfo.contactPerson
            },
            language: request.data.language || 'sv-SE',
            additionalData: {
                applicantInfo: request.data.applicantInfo,
                applicationId: request.data.applicationId
            },
            adminEmail: true
        });
        if (!adminResult.success) {
            console.error('❌ Failed to send B2B admin notification email:', adminResult.error);
            throw new Error(`Failed to send admin notification: ${adminResult.error}`);
        }
        console.log('✅ sendB2BApplicationEmails: Both emails sent successfully');
        return {
            success: true,
            applicantMessageId: applicantResult.messageId,
            adminMessageId: adminResult.messageId,
            details: {
                applicant: applicantResult.details,
                admin: adminResult.details
            }
        };
    }
    catch (error) {
        console.error('❌ sendB2BApplicationEmails: Fatal error:', error);
        throw error;
    }
});
//# sourceMappingURL=sendB2BApplicationEmails.js.map