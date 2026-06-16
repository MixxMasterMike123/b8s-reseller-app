"use strict";
// Server-side per-shop add-on entitlement reader. Mirrors the client's
// default-ON semantics (src/config/addons.js isFeatureEnabled): a feature is
// enabled unless EXPLICITLY set to false on shops/{shopId}.features. So a shop
// with no `features` field (e.g. the original b8shield shop), a missing key, or
// an unreadable doc all resolve to ENABLED — nothing is silently gated off.
//
// Used to enforce add-on flags inside Cloud Functions (P4.5b: affiliate). The
// `shops` doc lives in the named DB `b8s-reseller-db` — same `db` the rest of
// the functions read it through (see config/database + createShopUser.ts).
//
// This is the SERVER half of the affiliate money-path gate: it MUST agree with
// the client's useShopFeatures().isEnabled(...) decision, or the displayed
// total and the Stripe charge diverge (total-parity break). See
// docs/P4_5B_AFFILIATE_ENFORCEMENT_PLAN.md.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isShopFeatureEnabled = void 0;
const database_1 = require("./database");
const tenancy_1 = require("./tenancy");
/**
 * Is `key` enabled for `shopId`? Default-ON: true unless the flag is the literal
 * boolean false. Fails OPEN (returns true) on a missing doc or a read error, so
 * a transient Firestore problem never disables a paid feature mid-checkout.
 */
const isShopFeatureEnabled = async (shopId, key) => {
    try {
        const id = (shopId || tenancy_1.DEFAULT_SHOP_ID).trim() || tenancy_1.DEFAULT_SHOP_ID;
        const snap = await database_1.db.collection('shops').doc(id).get();
        if (!snap.exists)
            return true; // no shop doc yet → default-ON
        const features = snap.data()?.features;
        if (!features || typeof features !== 'object')
            return true; // no features map → default-ON
        return features[key] !== false; // explicit false disables; anything else → ON
    }
    catch (err) {
        console.warn(`isShopFeatureEnabled(${shopId}, ${key}) failed; defaulting ON:`, err);
        return true;
    }
};
exports.isShopFeatureEnabled = isShopFeatureEnabled;
//# sourceMappingURL=shopFeatures.js.map