"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAffiliateWelcomeEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const shared_utils_1 = require("../shared-utils");
// Send affiliate welcome email with credentials
exports.sendAffiliateWelcomeEmail = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth, data } = request;
    if (!userAuth?.uid) {
        throw new Error('Unauthorized');
    }
    try {
        const { affiliateData, temporaryPassword } = data;
        if (!affiliateData || !temporaryPassword) {
            throw new Error('Affiliate data and temporary password are required');
        }
        // Send welcome email using existing template
        const emailTemplate = (0, shared_utils_1.getEmail)('affiliateWelcome', affiliateData.preferredLang || 'sv-SE', {
            affiliateData,
            temporaryPassword,
            wasExistingAuthUser: affiliateData.wasExistingAuthUser || false
        });
        const emailData = (0, shared_utils_1.createEmailData)(affiliateData.email, shared_utils_1.EMAIL_FROM.affiliate, emailTemplate, {
            userData: {
                email: affiliateData.email,
                companyName: affiliateData.name || '',
                preferredLang: affiliateData.preferredLang
            },
            affiliateData,
            tempPassword: temporaryPassword,
            wasExistingAuthUser: affiliateData.wasExistingAuthUser
        });
        await (0, shared_utils_1.sendEmail)(emailData);
        console.log(`${affiliateData.wasExistingAuthUser ? 'New credentials' : 'Welcome email'} sent successfully to affiliate ${affiliateData.email}`);
        return {
            success: true,
            wasExistingAuthUser: affiliateData.wasExistingAuthUser || false,
            email: affiliateData.email
        };
    }
    catch (error) {
        console.error('Error sending affiliate welcome email:', error);
        throw new Error('Failed to send affiliate welcome email');
    }
});
//# sourceMappingURL=sendAffiliateWelcomeEmail.js.map