"use strict";
// createShopUser — P4.6: a PLATFORM operator provisions a SHOP ADMIN for a
// tenant (Auth account + users/{uid} doc + custom claims + credentials email).
//
// Why a Cloud Function: only the Admin SDK can create a Firebase Auth account
// and set custom claims; the client modal cannot. Modeled on approveAffiliate
// (the one correct create-auth-user pattern that keys the Firestore doc by the
// real uid, so AuthContext, Firestore rules, and Storage claims all line up).
//
// Security: platform-only (requirePlatform). A shop admin must NOT be able to
// mint admins for other shops — only the operator can. The new doc carries
// role:'admin' + shopId + platform:false, which the Firestore rules
// (isAdminOfShop) and AuthContext (isAdmin/useShopId via activeShop) recognize.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShopUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_urls_1 = require("../../config/app-urls");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("../../config/database");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const authGuard_1 = require("./authGuard");
const auth = (0, auth_1.getAuth)();
exports.createShopUser = (0, https_1.onCall)({
    region: 'us-central1',
    secrets: ['RESEND_API_KEY'],
    memory: '256MiB',
    timeoutSeconds: 120,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
}, async (request) => {
    // 1. Platform-only.
    await (0, authGuard_1.requirePlatform)(request.auth?.uid);
    const shopId = (request.data.shopId || '').trim();
    const email = (request.data.email || '').trim().toLowerCase();
    const name = (request.data.name || '').trim() || email;
    if (!shopId)
        throw new https_1.HttpsError('invalid-argument', 'shopId is required');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new https_1.HttpsError('invalid-argument', 'A valid email is required');
    }
    // 2. The shop must exist (don't strand an admin on a non-existent tenant).
    const shopSnap = await database_1.db.collection('shops').doc(shopId).get();
    if (!shopSnap.exists) {
        throw new https_1.HttpsError('not-found', `Shop "${shopId}" does not exist`);
    }
    // 3. Create (or reuse) the Firebase Auth user. Same fallback as approveAffiliate.
    const tempPassword = Math.random().toString(36).slice(2) + 'A1!';
    let authUser;
    let wasExistingAuthUser = false;
    try {
        authUser = await auth.createUser({
            email,
            password: tempPassword,
            displayName: name,
            emailVerified: true,
        });
    }
    catch (error) {
        if (error.code === 'auth/email-already-exists') {
            authUser = await auth.getUserByEmail(email);
            // DENY-BY-DEFAULT reuse guard. Creating a shop admin grants privilege,
            // so we only reuse an existing Auth account when it is ALREADY this
            // shop's admin (re-inviting / resending credentials). Every other
            // existing account is refused — including accounts with NO users/{uid}
            // doc, which is exactly the shape of B2C customers (b2cCustomers/) and
            // affiliates (affiliates/{uid}): promoting one of those to admin would
            // be a privilege escalation. The operator must use a fresh email.
            const existing = await database_1.db.collection('users').doc(authUser.uid).get();
            const ed = existing.exists ? existing.data() : null;
            const isSameShopAdmin = ed && ed.role === 'admin' && ed.platform !== true && ed.shopId === shopId;
            if (!isSameShopAdmin) {
                throw new https_1.HttpsError('already-exists', `${email} is already in use by another account and cannot be made an admin of "${shopId}". Use a different email.`);
            }
            await auth.updateUser(authUser.uid, { password: tempPassword });
            wasExistingAuthUser = true;
        }
        else {
            throw error;
        }
    }
    const uid = authUser.uid;
    // 4. Write the shop-admin doc KEYED BY UID (so rules + AuthContext + claims work).
    await database_1.db.collection('users').doc(uid).set({
        email,
        contactPerson: name,
        role: 'admin',
        shopId,
        platform: false,
        active: true,
        isActive: true,
        createdByPlatform: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(wasExistingAuthUser ? {} : { createdAt: firestore_1.FieldValue.serverTimestamp() }),
    }, { merge: true });
    // 5. Set custom claims inline (needed for Storage rules, which can't read the
    //    named DB). In-app/Firestore recognition needs only the doc above.
    await auth.setCustomUserClaims(uid, { role: 'admin', shopId, platform: false });
    // 6. Send login credentials via the orchestrator (same emailType as
    //    sendLoginCredentialsEmail). Best-effort: a mail failure must not undo a
    //    successfully provisioned admin — surface it in the response instead.
    let emailSent = false;
    let emailError = null;
    try {
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        const result = await orchestrator.sendEmail({
            emailType: 'LOGIN_CREDENTIALS',
            userId: uid,
            customerInfo: { email, name },
            language: 'sv-SE',
            additionalData: {
                credentials: { email, temporaryPassword: tempPassword },
                wasExistingAuthUser,
                userInfo: { name, email },
                accountType: 'B2B',
            },
            adminEmail: false,
        });
        emailSent = !!result.success;
        if (!result.success)
            emailError = result.error || 'Email sending failed';
    }
    catch (e) {
        emailError = e instanceof Error ? e.message : 'Email sending failed';
    }
    return { success: true, uid, shopId, email, wasExistingAuthUser, emailSent, emailError };
});
//# sourceMappingURL=createShopUser.js.map