"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertShopAllowed = exports.getPrintShopContext = void 0;
// printGuard.ts — auth + scope for the print-shop CALLABLES.
//
// The print_shop role gets ZERO direct Firestore/Storage access (document-level
// rules can't field-scope an order's customer PII). All access flows through the
// callables in this folder, which enforce scope HERE by reading the caller's LIVE
// users/{uid} doc — so deactivating or re-roling a printer takes effect immediately
// (no token-TTL window, matching the firestore.rules "authority from the doc" rule).
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("../config/database");
/**
 * Assert the caller is an ACTIVE print_shop user; return their allowed shop list.
 * Throws (unauthenticated / permission-denied) otherwise. Reads the live doc.
 */
async function getPrintShopContext(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const snap = await database_1.db.collection('users').doc(authUid).get();
    const data = snap.exists ? snap.data() : null;
    if (!data || data.role !== 'print_shop' || data.active !== true) {
        throw new https_1.HttpsError('permission-denied', 'Print shop access required');
    }
    const shops = Array.isArray(data.printShopShops) ? data.printShopShops.filter((s) => typeof s === 'string') : [];
    if (shops.length === 0) {
        // A printer with no assigned shops can see nothing — explicit, not a silent empty.
        throw new https_1.HttpsError('permission-denied', 'No shops assigned to this print account');
    }
    return { uid: authUid, printShopShops: shops };
}
exports.getPrintShopContext = getPrintShopContext;
/** Assert an order's shop is one the caller may fulfil (per-resource scope check). */
function assertShopAllowed(ctx, shopId) {
    if (!shopId || !ctx.printShopShops.includes(shopId)) {
        throw new https_1.HttpsError('permission-denied', 'This order is not in your assigned shops');
    }
}
exports.assertShopAllowed = assertShopAllowed;
//# sourceMappingURL=printGuard.js.map