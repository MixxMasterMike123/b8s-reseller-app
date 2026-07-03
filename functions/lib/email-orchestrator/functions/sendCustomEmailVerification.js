"use strict";
// sendCustomEmailVerification - Complete B2C Email Verification System
// Replaces: Firebase's sendEmailVerification with custom verification flow
// Creates verification record + sends custom branded email
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomEmailVerification = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_urls_1 = require("../../config/app-urls");
const firestore_1 = require("firebase-admin/firestore");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const authGuard_1 = require("./authGuard");
// Initialize Firestore with named database
const db = (0, firestore_1.getFirestore)('b8s-reseller-db');
exports.sendCustomEmailVerification = (0, https_1.onCall)({
    region: 'us-central1',
    secrets: ['RESEND_API_KEY'],
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: app_urls_1.appUrls.CORS_ORIGINS
}, async (request) => {
    try {
        // SECURITY: only the just-created account itself may request its own
        // verification email — otherwise this is an open mailer.
        if (!request.auth || request.auth.uid !== request.data.firebaseAuthUid) {
            throw new Error('Authentication required: callers may only request verification for their own account');
        }
        console.log('🔐 sendCustomEmailVerification: Starting custom verification flow');
        console.log('🔐 Request data:', {
            customerEmail: request.data.customerInfo.email,
            customerName: request.data.customerInfo.firstName || request.data.customerInfo.name,
            firebaseAuthUid: request.data.firebaseAuthUid,
            source: request.data.source,
            language: request.data.language
        });
        // Validate required data
        if (!request.data.customerInfo?.email) {
            throw new Error('Customer email is required');
        }
        if (!request.data.firebaseAuthUid) {
            throw new Error('Firebase Auth UID is required');
        }
        // Generate secure verification code
        const verificationCode = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const language = request.data.language || request.data.customerInfo.preferredLang || 'sv-SE';
        // TENANT ISOLATION: stamp the shop this account belongs to so the
        // verification record is shop-scoped (INV-1). The verify step looks the
        // doc up by code-as-doc-id bound to firebaseAuthUid, so this is for
        // scoping/audit rather than an attack boundary. Falls back to
        // DEFAULT_SHOP_ID (never untagged).
        const shopId = await (0, authGuard_1.resolveShopIdByEmail)(request.data.customerInfo.email);
        // Store verification record in Firestore
        console.log('💾 Creating verification record...');
        const verificationData = {
            shopId,
            email: request.data.customerInfo.email,
            firebaseAuthUid: request.data.firebaseAuthUid,
            verificationCode: verificationCode,
            expiresAt: expiresAt,
            verified: false,
            createdAt: new Date(),
            source: request.data.source || 'registration',
            language: language,
            customerInfo: {
                firstName: request.data.customerInfo.firstName,
                lastName: request.data.customerInfo.lastName,
                name: request.data.customerInfo.name,
                email: request.data.customerInfo.email
            }
        };
        await db.collection('emailVerifications').doc(verificationCode).set(verificationData);
        console.log('✅ Verification record created with code:', verificationCode);
        // Send custom verification email via orchestrator
        console.log('📧 Sending custom verification email...');
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        const emailResult = await orchestrator.sendEmail({
            emailType: 'EMAIL_VERIFICATION',
            customerInfo: {
                email: request.data.customerInfo.email,
                firstName: request.data.customerInfo.firstName,
                lastName: request.data.customerInfo.lastName,
                name: request.data.customerInfo.name
            },
            language: language,
            additionalData: {
                verificationCode: verificationCode,
                source: request.data.source || 'registration'
            },
            shopId // tenant identity: verification mail sends as the shop
        });
        if (emailResult.success) {
            console.log('✅ Custom verification email sent successfully');
            return {
                success: true,
                messageId: emailResult.messageId,
                verificationCode: verificationCode,
                email: request.data.customerInfo.email,
                source: request.data.source,
                language: language,
                expiresAt: expiresAt.toISOString()
            };
        }
        else {
            console.error('❌ Custom verification email failed:', emailResult.error);
            // Clean up verification record if email failed
            await db.collection('emailVerifications').doc(verificationCode).delete();
            throw new Error(emailResult.error || 'Custom verification email sending failed');
        }
    }
    catch (error) {
        console.error('❌ sendCustomEmailVerification: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in custom email verification');
    }
});
//# sourceMappingURL=sendCustomEmailVerification.js.map