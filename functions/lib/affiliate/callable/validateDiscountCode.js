"use strict";
/**
 * Validates an affiliate/discount code for the storefront cart.
 * Replaces the client-side `affiliates` collection query, which would expose
 * affiliate PII (email, earnings) to anonymous visitors under locked-down
 * Firestore rules. Returns only what checkout needs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDiscountCode = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("../../config/database");
const shopFeatures_1 = require("../../config/shopFeatures");
exports.validateDiscountCode = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
}, async (request) => {
    const rawCode = (request.data?.code || '').toString().trim().toUpperCase();
    // TENANT ISOLATION: affiliate codes are unique only WITHIN a shop, so the
    // lookup must be scoped to the storefront's own shop. This isn't an
    // authority check (the caller is an anonymous shopper) — it's correctness:
    // a code belonging to shop B must not validate (or leak its discount) on
    // shop A's storefront. The storefront passes its own shopId (known from the
    // URL/shop context).
    const shopId = (request.data?.shopId || '').toString().trim();
    if (!rawCode || rawCode.length > 50) {
        throw new https_1.HttpsError('invalid-argument', 'A discount code is required');
    }
    if (!shopId) {
        throw new https_1.HttpsError('invalid-argument', 'A shopId is required');
    }
    const snapshot = await database_1.db
        .collection('affiliates')
        .where('shopId', '==', shopId)
        .where('affiliateCode', '==', rawCode)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    if (snapshot.empty) {
        return { valid: false };
    }
    const affiliate = snapshot.docs[0].data();
    // Defense-in-depth: if the affiliate's shop has the affiliate add-on
    // disabled, the code is not valid here either (matches the createPaymentIntent
    // gate + the client). Default-ON, so existing shops are unaffected.
    if (!(await (0, shopFeatures_1.isShopFeatureEnabled)(affiliate.shopId, 'affiliate'))) {
        return { valid: false };
    }
    return {
        valid: true,
        code: rawCode,
        checkoutDiscount: affiliate.checkoutDiscount || 0
    };
});
//# sourceMappingURL=validateDiscountCode.js.map