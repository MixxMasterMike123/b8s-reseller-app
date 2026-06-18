"use strict";
// Shared auth guards for email callables. These functions can send branded
// email to arbitrary recipients, so every privileged one must verify the
// caller — otherwise the system is an open phishing mailer.
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminOfShop = exports.getAdminContext = exports.requirePlatform = exports.requireAuth = exports.requireAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("../../config/database");
async function requireAdmin(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const userDoc = await database_1.db.collection('users').doc(authUid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
}
exports.requireAdmin = requireAdmin;
function requireAuth(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
}
exports.requireAuth = requireAuth;
// Platform super-admin only (manages ALL shops). Stricter than requireAdmin:
// the caller's users/{uid} doc must have platform === true. Used by operator-
// only callables (e.g. provisioning a shop admin for any tenant).
async function requirePlatform(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const userDoc = await database_1.db.collection('users').doc(authUid).get();
    const data = userDoc.data();
    if (!userDoc.exists || data?.role !== 'admin' || data?.platform !== true) {
        throw new https_1.HttpsError('permission-denied', 'Platform access required');
    }
}
exports.requirePlatform = requirePlatform;
// Resolve + assert the caller is an admin, returning their tenant context.
// Throws like requireAdmin if not an admin.
async function getAdminContext(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const snap = await database_1.db.collection('users').doc(authUid).get();
    const data = snap.data();
    if (!snap.exists || data?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    return {
        uid: authUid,
        role: data.role,
        platform: data?.platform === true,
        shopId: data?.shopId ?? null,
    };
}
exports.getAdminContext = getAdminContext;
// TENANT ISOLATION (the core multi-tenant guard for Admin-SDK functions, which
// BYPASS Firestore security rules — so the shop boundary MUST be enforced here
// in code). Asserts the caller is an admin who may administer `targetShopId`:
// a platform super-admin may act on ANY shop; a shop admin only on their OWN.
// Mirrors isAdminOfShop(shopId) in firestore.rules. Returns the caller context.
//
// IMPORTANT: `targetShopId` must be derived from a TRUSTWORTHY source — the
// resource being mutated (e.g. the target customer/order/affiliate doc's
// shopId), NEVER from a caller-supplied request payload field. Passing the
// request's own shopId here would defeat the check.
async function requireAdminOfShop(targetShopId, authUid) {
    const ctx = await getAdminContext(authUid);
    if (ctx.platform)
        return ctx; // platform bypasses shop-scoping
    if (!targetShopId || ctx.shopId !== targetShopId) {
        throw new https_1.HttpsError('permission-denied', 'Tenant isolation: not an admin of this shop');
    }
    return ctx;
}
exports.requireAdminOfShop = requireAdminOfShop;
//# sourceMappingURL=authGuard.js.map