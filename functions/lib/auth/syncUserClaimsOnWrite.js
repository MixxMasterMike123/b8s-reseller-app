"use strict";
/**
 * Keep a user's Auth custom claims ({role, shopId, platform}) in sync with their
 * Firestore users/{uid} doc — on every write — and REVOKE refresh tokens on any
 * privilege reduction so a stale token can't retain access.
 *
 * Why: the security rules + Storage rules trust the custom claims (token.shopId /
 * token.platform) for tenant isolation. Claims were previously set only by
 * createShopUser (on provision) and syncAdminClaims (a manual maintenance HTTP
 * call). So demoting an admin (platform true→false), moving their shopId, or
 * un-admining them left the OLD claim live in their token for up to ~1h (token
 * TTL) — a cross-tenant / privilege-retention window, worst on Storage (claim is
 * the SOLE authority there). This trigger closes that window. (See
 * docs/TENANT_ISOLATION_HARDENING_PLAN.md.)
 *
 * Scope: acts only for users who ARE or WERE an admin (role=='admin'). Plain
 * B2B/B2C users (the bulk of the collection) get no claims and are skipped, so
 * this is cheap. Idempotent: skips when claims already match.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUserClaimsOnWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const auth_1 = require("firebase-admin/auth");
const app_1 = require("firebase-admin/app");
const auth = (0, auth_1.getAuth)((0, app_1.getApp)());
// The claim shape this project uses everywhere (matches syncAdminClaims +
// createShopUser): role/shopId/platform. A non-admin clears the admin claims.
function desiredClaims(userData) {
    if (!userData || userData.role !== 'admin') {
        return { role: null, shopId: null, platform: false };
    }
    return {
        role: 'admin',
        shopId: userData.shopId || null,
        platform: userData.platform === true,
    };
}
// A privilege REDUCTION (vs the prior doc state) that must invalidate live
// tokens: losing platform, losing admin, or moving to a different shop (so the
// old shopId claim can't keep reading the prior shop).
function isPrivilegeReduction(before, after) {
    const b = desiredClaims(before);
    const a = desiredClaims(after);
    if (b.platform === true && a.platform !== true)
        return true; // platform → not
    if (b.role === 'admin' && a.role !== 'admin')
        return true; // admin → not
    if (b.role === 'admin' && a.role === 'admin' && b.shopId !== a.shopId)
        return true; // shop moved
    return false; // no privilege reduction
}
exports.syncUserClaimsOnWrite = (0, firestore_1.onDocumentWritten)({
    document: 'users/{userId}',
    database: 'b8s-reseller-db',
    region: 'us-central1',
    memory: '256MiB',
}, async (event) => {
    const userId = event.params.userId;
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    // Only act when the user is or was an admin — plain users carry no claims.
    const wasAdmin = before?.role === 'admin';
    const isAdmin = after?.role === 'admin';
    if (!wasAdmin && !isAdmin)
        return;
    const desired = desiredClaims(after);
    let userRecord;
    try {
        userRecord = await auth.getUser(userId);
    }
    catch (err) {
        if (err?.code === 'auth/user-not-found') {
            // No Auth account for this doc id (e.g. an admin-created B2B contact
            // whose id is a Firestore id, not an Auth uid) — nothing to sync.
            firebase_functions_1.logger.info(`syncUserClaimsOnWrite: no Auth user for ${userId}, skipping`);
            return;
        }
        // Transient/unknown error — do NOT swallow: rethrow so the trigger RETRIES.
        // Silently skipping here would leave a demotion's stale claim live (the
        // exact window this trigger exists to close). Fail closed, not open.
        firebase_functions_1.logger.error(`syncUserClaimsOnWrite: getUser failed for ${userId}, will retry`, { code: err?.code });
        throw err;
    }
    const existing = userRecord.customClaims || {};
    const upToDate = (existing.role ?? null) === desired.role &&
        (existing.shopId ?? null) === desired.shopId &&
        (existing.platform === true) === desired.platform;
    if (!upToDate) {
        // Preserve any unrelated claims; overwrite the three we own.
        await auth.setCustomUserClaims(userId, { ...existing, ...desired });
        firebase_functions_1.logger.info(`syncUserClaimsOnWrite: claims updated for ${userId}`, { desired });
    }
    // Revoke live tokens on any privilege reduction so the stale claim can't be
    // used until the client refreshes its ID token.
    if (isPrivilegeReduction(before, after)) {
        await auth.revokeRefreshTokens(userId);
        firebase_functions_1.logger.warn(`syncUserClaimsOnWrite: revoked refresh tokens for ${userId} (privilege reduction)`);
    }
});
//# sourceMappingURL=syncUserClaimsOnWrite.js.map