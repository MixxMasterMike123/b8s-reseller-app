"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const shared_utils_1 = require("../shared-utils");
// Test email endpoint
exports.testEmail = (0, https_1.onRequest)(async (req, res) => {
    try {
        console.log('Testing email functionality...');
        const testEmailTemplate = {
            subject: "Test Email from B8Shield Portal",
            text: "This is a test email to verify Gmail SMTP integration is working.",
            html: "<h2>Test Email</h2><p>This is a test email to verify Gmail SMTP integration is working.</p>"
        };
        const emailData = (0, shared_utils_1.createEmailData)("micke.ohlen@gmail.com", `"B8Shield Test" <info@b8shield.com>`, testEmailTemplate, {});
        await (0, shared_utils_1.sendEmail)(emailData);
        console.log('Test email sent successfully');
        res.status(200).json({
            success: true,
            message: 'Test email sent successfully',
            config: {
                service: 'gmail',
                from_email: 'b8shield.reseller@gmail.com'
            }
        });
    }
    catch (error) {
        console.error('Error sending test email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            success: false,
            error: errorMessage,
            config: {
                service: 'gmail',
                from_email: 'b8shield.reseller@gmail.com'
            }
        });
    }
});
//# sourceMappingURL=testEmail.js.map