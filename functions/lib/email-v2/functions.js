"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPasswordResetV3 = exports.sendPasswordResetV3 = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const EmailService_1 = require("./EmailService");
const passwordReset_1 = require("./templates/passwordReset");
// Initialize Firestore with named database and Auth
const db = (0, firestore_1.getFirestore)('b8s-reseller-db');
const auth = (0, auth_1.getAuth)();
// Helper function for email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// New, clean password reset function
exports.sendPasswordResetV3 = (0, https_1.onCall)(async (request) => {
    console.log('🚀 sendPasswordResetV3: Starting clean email system...');
    const { email } = request.data;
    if (!email || !isValidEmail(email)) {
        console.log('❌ Invalid email provided');
        throw new https_1.HttpsError('invalid-argument', 'Valid email is required');
    }
    try {
        console.log(`🔍 Processing password reset for: ${email}`);
        // Generate secure reset code
        const resetCode = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        const timestamp = new Date().toLocaleString('sv-SE');
        const userAgent = request.rawRequest?.headers?.['user-agent'] || 'Unknown device';
        // Try to find user's preferred language
        let preferredLang = 'sv-SE';
        // Check affiliates collection
        try {
            const affiliatesSnapshot = await db.collection('affiliates')
                .where('email', '==', email).get();
            if (!affiliatesSnapshot.empty) {
                const affiliateData = affiliatesSnapshot.docs[0].data();
                preferredLang = affiliateData.preferredLang || 'sv-SE';
                console.log(`Found affiliate with preferred language: ${preferredLang}`);
            }
        }
        catch (error) {
            console.log('No affiliate found, checking B2C customers...');
        }
        // Check B2C customers collection
        try {
            const b2cSnapshot = await db.collection('b2cCustomers')
                .where('email', '==', email).get();
            if (!b2cSnapshot.empty) {
                const customerData = b2cSnapshot.docs[0].data();
                preferredLang = customerData.preferredLang || 'sv-SE';
                console.log(`Found B2C customer with preferred language: ${preferredLang}`);
            }
        }
        catch (error) {
            console.log('No B2C customer found, using default language');
        }
        // Store reset code in Firestore
        await db.collection('passwordResets').add({
            email,
            resetCode,
            expiresAt,
            used: false,
            createdAt: new Date(),
            userAgent
        });
        // Get email template
        const template = (0, passwordReset_1.getPasswordResetTemplate)({
            email,
            resetCode,
            userAgent,
            timestamp
        }, preferredLang);
        // Send email using new EmailService
        const emailService = EmailService_1.EmailService.getInstance();
        // Verify connection first
        const connectionOk = await emailService.verifyConnection();
        if (!connectionOk) {
            throw new Error('SMTP connection failed');
        }
        // Send the email
        const messageId = await emailService.sendEmail({
            to: email,
            subject: template.subject,
            html: template.html
        });
        console.log(`✅ Password reset email sent successfully to ${email}`);
        return {
            success: true,
            email,
            language: preferredLang,
            messageId,
            expiresAt: expiresAt.toISOString()
        };
    }
    catch (error) {
        console.error('❌ Password reset failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to send password reset email');
    }
});
// Function to confirm password reset with custom code (V3)
exports.confirmPasswordResetV3 = (0, https_1.onCall)(async (request) => {
    const { resetCode, newPassword } = request.data;
    if (!resetCode || !newPassword) {
        throw new https_1.HttpsError('invalid-argument', 'Reset code and new password are required');
    }
    if (newPassword.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }
    try {
        console.log(`🔍 Processing password reset confirmation for code: ${resetCode}`);
        // Find and validate the reset code
        const resetQuery = await db.collection('passwordResets')
            .where('resetCode', '==', resetCode)
            .where('used', '==', false)
            .get();
        if (resetQuery.empty) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid or already used reset code');
        }
        const resetDoc = resetQuery.docs[0];
        const resetData = resetDoc.data();
        // Check if code has expired (1 hour)
        const now = new Date();
        const expiresAt = resetData.expiresAt.toDate();
        if (now > expiresAt) {
            throw new https_1.HttpsError('invalid-argument', 'Reset code has expired');
        }
        // Find the user by email
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(resetData.email);
        }
        catch (error) {
            throw new https_1.HttpsError('not-found', 'User not found');
        }
        // Update the user's password using Firebase Admin
        await auth.updateUser(userRecord.uid, {
            password: newPassword
        });
        // Mark the reset code as used
        await resetDoc.ref.update({
            used: true,
            usedAt: new Date()
        });
        console.log(`✅ Password successfully reset for user: ${resetData.email}`);
        return {
            success: true,
            email: resetData.email
        };
    }
    catch (error) {
        console.error('❌ Error confirming password reset:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to reset password');
    }
});
//# sourceMappingURL=functions.js.map