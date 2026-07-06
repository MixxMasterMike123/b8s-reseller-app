"use strict";
// Content Studio ("Innehållsstudio") — shared auth + feature gate.
//
// Unlike most add-ons (default-ON; see config/shopFeatures.isShopFeatureEnabled),
// Content Studio is OPT-IN: the AI content generator is a paid capability, so it
// is enabled ONLY when shops/{shopId}.features.contentStudio === true (explicit
// boolean true). A missing doc, a missing key, or an unreadable doc all resolve
// to DISABLED — the opposite failure mode from the default-ON add-ons, on
// purpose. The platform operator bypasses the gate entirely.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isShopMediaPath = exports.shopBrandName = exports.requireContentStudio = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("../config/database");
const authGuard_1 = require("../email-orchestrator/functions/authGuard");
// Assert the caller may use Content Studio for `shopId`:
//   1. requireAdminOfShop — a shop admin only on their OWN shop, platform on any
//      (Admin SDK bypasses Firestore rules, so the boundary is enforced here).
//   2. contentStudio feature must be explicitly true for the shop, UNLESS the
//      caller is the platform operator (who may use it regardless).
// Returns { shopId (trimmed), ctx, data } so callers reuse the loaded shop doc.
async function requireContentStudio(rawShopId, uid) {
    const shopId = (rawShopId || '').trim();
    if (!shopId)
        throw new https_1.HttpsError('invalid-argument', 'shopId krävs.');
    const ctx = await (0, authGuard_1.requireAdminOfShop)(shopId, uid);
    const snap = await database_1.db.collection('shops').doc(shopId).get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', `Butiken "${shopId}" finns inte.`);
    }
    const data = snap.data() || {};
    // Opt-in gate: explicit true required. Platform bypasses.
    if (!ctx.platform && data.features?.contentStudio !== true) {
        throw new https_1.HttpsError('failed-precondition', 'Innehållsstudio är inte aktiverad för den här butiken.');
    }
    return { shopId, ctx, data };
}
exports.requireContentStudio = requireContentStudio;
// The brand name to seed prompts with: prefer the storefront shop name, then a
// generic name field, else the shop id. Kept here so both callables agree.
function shopBrandName(shopId, data) {
    return (data.storeIdentity?.shopName ||
        data.name ||
        shopId);
}
exports.shopBrandName = shopBrandName;
// A media path belongs to this shop if it lives under the persistent library
// (content-studio/{shopId}/) or the disposable quick-upload area
// (content-studio-quick/{shopId}/ — auto-purged by a bucket lifecycle rule,
// never listed in the library). Both callables validate against this.
function isShopMediaPath(shopId, p) {
    return (p.startsWith(`content-studio/${shopId}/`) ||
        p.startsWith(`content-studio-quick/${shopId}/`));
}
exports.isShopMediaPath = isShopMediaPath;
//# sourceMappingURL=gate.js.map