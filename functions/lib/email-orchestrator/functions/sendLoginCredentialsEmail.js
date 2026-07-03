"use strict";
// sendLoginCredentialsEmail - Unified Login Credentials Function
// Replaces: sendWelcomeCredentialsV3, sendAffiliateCredentialsV3, "Skicka inloggningsuppgifter" buttons
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLoginCredentialsEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_urls_1 = require("../../config/app-urls");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const authGuard_1 = require("./authGuard");
const database_1 = require("../../config/database");
exports.sendLoginCredentialsEmail = (0, https_1.onCall)({
    region: 'us-central1',
    secrets: ['RESEND_API_KEY'],
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: app_urls_1.appUrls.CORS_ORIGINS
}, async (request) => {
    try {
        // SECURITY: privileged mailer - basic auth gate; full shop-parity check
        // happens AFTER the target user/affiliate record is resolved server-side
        // (the record's OWN shopId is the trustworthy source). Admin-SDK bypasses
        // Firestore rules.
        (0, authGuard_1.requireAuth)(request.auth?.uid);
        console.log('📧 sendLoginCredentialsEmail: Starting unified credentials email');
        console.log('📧 Request data:', {
            userEmail: request.data.userInfo.email,
            accountType: request.data.accountType,
            wasExistingAuthUser: request.data.wasExistingAuthUser,
            hasTemporaryPassword: !!request.data.credentials.temporaryPassword,
            hasAffiliateCode: !!request.data.credentials.affiliateCode
        });
        // Validate required data
        if (!request.data.userInfo?.email) {
            throw new Error('User email is required');
        }
        if (!request.data.userInfo?.name) {
            throw new Error('User name is required');
        }
        if (!request.data.credentials?.email) {
            throw new Error('Credentials email is required');
        }
        if (!request.data.accountType) {
            throw new Error('Account type is required');
        }
        // TENANT ISOLATION: resolve the TARGET user's shop from their own record
        // (trustworthy source) and enforce shop parity — a shop admin may only
        // email credentials to their own shop's users; platform may email any.
        // AFFILIATE accounts live in `affiliates`; B2B in `users`. The caller
        // passes the record's doc id as `userId`; fall back to an email lookup.
        const targetCollection = request.data.accountType === 'AFFILIATE' ? 'affiliates' : 'users';
        const targetEmail = request.data.credentials.email || request.data.userInfo.email;
        let targetShopId;
        if (request.data.userId) {
            const targetSnap = await database_1.db.collection(targetCollection).doc(request.data.userId).get();
            if (targetSnap.exists) {
                targetShopId = targetSnap.data()?.shopId;
            }
        }
        if (targetShopId === undefined) {
            const byEmail = await database_1.db.collection(targetCollection)
                .where('email', '==', targetEmail)
                .limit(1)
                .get();
            if (byEmail.empty) {
                throw new Error('Target user not found');
            }
            targetShopId = byEmail.docs[0].data()?.shopId;
        }
        await (0, authGuard_1.requireAdminOfShop)(targetShopId, request.auth?.uid);
        // Initialize EmailOrchestrator
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        // Send login credentials email via orchestrator
        const result = await orchestrator.sendEmail({
            emailType: 'LOGIN_CREDENTIALS',
            userId: request.data.userId,
            customerInfo: {
                email: request.data.userInfo.email,
                name: request.data.userInfo.name
            },
            language: request.data.language || 'sv-SE',
            additionalData: {
                credentials: request.data.credentials,
                wasExistingAuthUser: request.data.wasExistingAuthUser || false,
                userInfo: request.data.userInfo,
                accountType: request.data.accountType
            },
            adminEmail: false
        });
        if (result.success) {
            console.log('✅ sendLoginCredentialsEmail: Success');
            return {
                success: true,
                messageId: result.messageId,
                details: result.details
            };
        }
        else {
            console.error('❌ sendLoginCredentialsEmail: Failed:', result.error);
            throw new Error(result.error || 'Login credentials email sending failed');
        }
    }
    catch (error) {
        console.error('❌ sendLoginCredentialsEmail: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in login credentials email');
    }
});
//# sourceMappingURL=sendLoginCredentialsEmail.js.map