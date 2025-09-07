"use strict";
// EmailOrchestrator Functions Index
// Unified email functions replacing ALL V1/V2/V3 email functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailOrchestrator = exports.sendOrderStatusUpdateEmail = exports.sendOrderConfirmationEmail = void 0;
// Import all unified email functions
var sendOrderConfirmationEmail_1 = require("./sendOrderConfirmationEmail");
Object.defineProperty(exports, "sendOrderConfirmationEmail", { enumerable: true, get: function () { return sendOrderConfirmationEmail_1.sendOrderConfirmationEmail; } });
var sendOrderStatusUpdateEmail_1 = require("./sendOrderStatusUpdateEmail");
Object.defineProperty(exports, "sendOrderStatusUpdateEmail", { enumerable: true, get: function () { return sendOrderStatusUpdateEmail_1.sendOrderStatusUpdateEmail; } });
// TODO: Implement remaining functions
// export { sendOrderNotificationAdmin } from './sendOrderNotificationAdmin';
// export { sendWelcomeEmail } from './sendWelcomeEmail';
// export { sendPasswordResetEmail } from './sendPasswordResetEmail';
// export { sendAffiliateWelcomeEmail } from './sendAffiliateWelcomeEmail';
// export { sendVerificationEmail } from './sendVerificationEmail';
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