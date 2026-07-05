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
    // 1) Affiliate codes FIRST (preserve existing behavior). An affiliate code
    // and a campaign code can never collide in practice; if they somehow do, the
    // affiliate discount wins (unchanged from before this add-on shipped).
    const snapshot = await database_1.db
        .collection('affiliates')
        .where('shopId', '==', shopId)
        .where('affiliateCode', '==', rawCode)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    if (!snapshot.empty) {
        const affiliate = snapshot.docs[0].data();
        // Defense-in-depth: if the affiliate's shop has the affiliate add-on
        // disabled, the code is not valid here either (matches the createPaymentIntent
        // gate + the client). Default-ON, so existing shops are unaffected.
        if (!(await (0, shopFeatures_1.isShopFeatureEnabled)(affiliate.shopId, 'affiliate'))) {
            return { valid: false };
        }
        return {
            valid: true,
            source: 'affiliate',
            code: rawCode,
            checkoutDiscount: affiliate.checkoutDiscount || 0
        };
    }
    // 2) Campaign discount codes ("Rabattkoder" add-on). Gated on the
    // discountCodes feature (default-ON). This is validation only — the discount
    // MATH is recomputed server-side in createPaymentIntent.computeOrderTotalsSek
    // (never trusts these numbers). minSpend is NOT checked here (the callable
    // has no cart) — it is enforced on BOTH parity sides where the cart is known.
    if (!(await (0, shopFeatures_1.isShopFeatureEnabled)(shopId, 'discountCodes'))) {
        return { valid: false };
    }
    const campaignSnap = await database_1.db
        .collection('discountCodes')
        .where('shopId', '==', shopId)
        .where('code', '==', rawCode)
        .where('active', '==', true)
        .limit(1)
        .get();
    if (campaignSnap.empty) {
        return { valid: false };
    }
    const campaign = campaignSnap.docs[0].data();
    // Validity window (best-effort; re-checked at recompute). startsAt/endsAt are
    // Firestore Timestamps or null (no bound).
    const now = Date.now();
    const startsAtMs = campaign.startsAt?.toMillis ? campaign.startsAt.toMillis() : null;
    const endsAtMs = campaign.endsAt?.toMillis ? campaign.endsAt.toMillis() : null;
    if (startsAtMs !== null && now < startsAtMs) {
        return { valid: false };
    }
    if (endsAtMs !== null && now > endsAtMs) {
        return { valid: false };
    }
    // Usage cap (best-effort; the webhook increments usedCount, and the recompute
    // re-checks → a filled-up code yields 0 discount server-side, so parity holds
    // even under a race).
    const maxUses = typeof campaign.maxUses === 'number' ? campaign.maxUses : null;
    const usedCount = typeof campaign.usedCount === 'number' ? campaign.usedCount : 0;
    if (maxUses !== null && usedCount >= maxUses) {
        return { valid: false };
    }
    return {
        valid: true,
        source: 'campaign',
        code: rawCode,
        type: campaign.type === 'fixed' ? 'fixed' : 'percent',
        value: Number(campaign.value) || 0,
        scope: campaign.scope === 'products' ? 'products' : 'all',
        productIds: Array.isArray(campaign.productIds) ? campaign.productIds : [],
        minSpend: typeof campaign.minSpend === 'number' ? campaign.minSpend : null
    };
});
//# sourceMappingURL=validateDiscountCode.js.map