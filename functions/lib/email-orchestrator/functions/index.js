"use strict";
// EmailOrchestrator Functions Index
// Unified email functions replacing ALL V1/V2/V3 email functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailOrchestrator = exports.sendB2BApplicationEmails = exports.sendAffiliateApplicationEmails = exports.confirmPasswordReset = exports.verifyEmailCode = exports.sendCustomEmailVerification = exports.sendEmailVerification = exports.approveAffiliate = exports.sendAffiliateWelcomeEmail = exports.sendLoginCredentialsEmail = exports.sendPasswordResetEmail = exports.sendOrderNotificationAdmin = exports.sendOrderStatusUpdateEmail = exports.sendOrderConfirmationEmail = void 0;
// Import all unified email functions
var sendOrderConfirmationEmail_1 = require("./sendOrderConfirmationEmail");
Object.defineProperty(exports, "sendOrderConfirmationEmail", { enumerable: true, get: function () { return sendOrderConfirmationEmail_1.sendOrderConfirmationEmail; } });
var sendOrderStatusUpdateEmail_1 = require("./sendOrderStatusUpdateEmail");
Object.defineProperty(exports, "sendOrderStatusUpdateEmail", { enumerable: true, get: function () { return sendOrderStatusUpdateEmail_1.sendOrderStatusUpdateEmail; } });
var sendOrderNotificationAdmin_1 = require("./sendOrderNotificationAdmin");
Object.defineProperty(exports, "sendOrderNotificationAdmin", { enumerable: true, get: function () { return sendOrderNotificationAdmin_1.sendOrderNotificationAdmin; } });
var sendPasswordResetEmail_1 = require("./sendPasswordResetEmail");
Object.defineProperty(exports, "sendPasswordResetEmail", { enumerable: true, get: function () { return sendPasswordResetEmail_1.sendPasswordResetEmail; } });
var sendLoginCredentialsEmail_1 = require("./sendLoginCredentialsEmail");
Object.defineProperty(exports, "sendLoginCredentialsEmail", { enumerable: true, get: function () { return sendLoginCredentialsEmail_1.sendLoginCredentialsEmail; } });
var sendAffiliateWelcomeEmail_1 = require("./sendAffiliateWelcomeEmail");
Object.defineProperty(exports, "sendAffiliateWelcomeEmail", { enumerable: true, get: function () { return sendAffiliateWelcomeEmail_1.sendAffiliateWelcomeEmail; } });
var approveAffiliate_1 = require("./approveAffiliate");
Object.defineProperty(exports, "approveAffiliate", { enumerable: true, get: function () { return approveAffiliate_1.approveAffiliate; } });
var sendEmailVerification_1 = require("./sendEmailVerification");
Object.defineProperty(exports, "sendEmailVerification", { enumerable: true, get: function () { return sendEmailVerification_1.sendEmailVerification; } });
var sendCustomEmailVerification_1 = require("./sendCustomEmailVerification");
Object.defineProperty(exports, "sendCustomEmailVerification", { enumerable: true, get: function () { return sendCustomEmailVerification_1.sendCustomEmailVerification; } });
var verifyEmailCode_1 = require("./verifyEmailCode");
Object.defineProperty(exports, "verifyEmailCode", { enumerable: true, get: function () { return verifyEmailCode_1.verifyEmailCode; } });
var confirmPasswordReset_1 = require("./confirmPasswordReset");
Object.defineProperty(exports, "confirmPasswordReset", { enumerable: true, get: function () { return confirmPasswordReset_1.confirmPasswordReset; } });
var sendAffiliateApplicationEmails_1 = require("./sendAffiliateApplicationEmails");
Object.defineProperty(exports, "sendAffiliateApplicationEmails", { enumerable: true, get: function () { return sendAffiliateApplicationEmails_1.sendAffiliateApplicationEmails; } });
var sendB2BApplicationEmails_1 = require("./sendB2BApplicationEmails");
Object.defineProperty(exports, "sendB2BApplicationEmails", { enumerable: true, get: function () { return sendB2BApplicationEmails_1.sendB2BApplicationEmails; } });
// TODO: Implement remaining functions
// Test function for EmailOrchestrator system
const https_1 = require("firebase-functions/v2/https");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.testEmailOrchestrator = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        console.log('🧪 testEmailOrchestrator: Running system test');
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        const result = await orchestrator.testSystem();
        console.log('🧪 testEmailOrchestrator: Test completed');
        return result;
    }
    catch (error) {
        console.error('❌ testEmailOrchestrator: Test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Test failed'
        };
    }
});
//# sourceMappingURL=index.js.map