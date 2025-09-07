"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPasswordResetMinimal = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const nodemailer = __importStar(require("nodemailer"));
// Gmail SMTP configuration - completely isolated
const gmailHost = (0, params_1.defineString)('SMTP_HOST', { default: 'smtp.gmail.com' });
const gmailPort = (0, params_1.defineString)('SMTP_PORT', { default: '587' });
const gmailUser = (0, params_1.defineString)('SMTP_USER', { default: 'b8shield.reseller@gmail.com' });
const gmailPass = (0, params_1.defineString)('SMTP_PASS');
// Minimal test password reset function
exports.testPasswordResetMinimal = (0, https_1.onCall)(async (request) => {
    console.log('🧪 TEST FUNCTION STARTED - Minimal password reset test');
    const { email } = request.data;
    if (!email) {
        console.log('❌ No email provided');
        throw new https_1.HttpsError('invalid-argument', 'Email is required');
    }
    console.log(`🧪 Testing password reset for: ${email}`);
    try {
        // Show what SMTP config we're actually using
        console.log(`🔧 TEST SMTP Config - Host: ${gmailHost.value()}, Port: ${gmailPort.value()}, User: ${gmailUser.value()}`);
        // Create Gmail transporter directly
        const transporter = nodemailer.createTransport({
            host: gmailHost.value(),
            port: parseInt(gmailPort.value()),
            secure: false,
            auth: {
                user: gmailUser.value(),
                pass: gmailPass.value()
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        console.log('🔧 Gmail transporter created');
        // Test connection first
        console.log('🔗 Testing Gmail SMTP connection...');
        await transporter.verify();
        console.log('✅ Gmail SMTP connection verified!');
        // Send simple test email
        const resetCode = 'TEST-' + Math.random().toString(36).substring(2, 8);
        const mailOptions = {
            from: `"B8Shield Test" <${gmailUser.value()}>`,
            to: email,
            subject: '🧪 B8Shield Password Reset Test',
            html: `
        <h2>🧪 Password Reset Test</h2>
        <p>This is a test email to verify Gmail SMTP is working.</p>
        <p><strong>Reset Code:</strong> ${resetCode}</p>
        <p>If you received this, Gmail SMTP is working correctly!</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
            text: `Password Reset Test - Reset Code: ${resetCode} - Time: ${new Date().toISOString()}`
        };
        console.log('📧 Sending test email...');
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!', result.messageId);
        return {
            success: true,
            message: 'Test password reset email sent successfully',
            messageId: result.messageId,
            resetCode: resetCode,
            smtpConfig: {
                host: gmailHost.value(),
                port: gmailPort.value(),
                user: gmailUser.value()
            }
        };
    }
    catch (error) {
        console.error('❌ Test function error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new https_1.HttpsError('internal', `Test failed: ${errorMessage}`);
    }
});
//# sourceMappingURL=testPasswordReset.js.map