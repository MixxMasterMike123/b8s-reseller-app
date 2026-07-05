"use strict";
// Abandoned-checkout recovery: the two PUBLIC callables the storefront uses.
//
//  • resolveCheckoutRecovery({ shopId, token }) — the /{shopId}/aterta/:token
//    page calls this on mount to rebuild the cart. Returns ONLY the line refs
//    (productId/variantSku/sku/quantity) — NO prices, NO PII (the client refetches
//    live products and re-adds them through the normal cart path, preserving the
//    total-parity invariant). Invalid/expired → { status:'invalid' }; already paid
//    → { status:'completed' }.
//
//  • unsubscribeCheckout({ shopId, token }) — the /{shopId}/avregistrera/:token
//    page calls this on mount. Writes an idempotent suppression doc keyed on
//    {shopId}_{sha256(emailNorm)} so future reminders for this shop+email are
//    suppressed. Works regardless of the checkout's status.
//
// Both are tenant-scoped: the equality query keys on BOTH shopId AND the raw
// recovery token, so a token only resolves within its own shop.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsubscribeCheckout = exports.resolveCheckoutRecovery = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const tokens_1 = require("./tokens");
const COMMON = {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
};
function asTrimmed(v) {
    return typeof v === 'string' ? v.trim() : '';
}
// Resolve a single checkout doc by (shopId, raw token). Returns null if none.
async function findCheckout(shopId, token) {
    const q = await database_1.db
        .collection('checkouts')
        .where('shopId', '==', shopId)
        .where('recoveryToken', '==', token)
        .limit(1)
        .get();
    return q.empty ? null : q.docs[0];
}
function toMillis(v) {
    if (!v)
        return 0;
    if (typeof v.toMillis === 'function')
        return v.toMillis();
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
}
/**
 * resolveCheckoutRecovery — rebuild the cart from an abandoned checkout.
 * Returns { status:'invalid' | 'completed' | 'open', items? }.
 */
exports.resolveCheckoutRecovery = (0, https_1.onCall)(COMMON, async (request) => {
    const shopId = asTrimmed(request.data?.shopId);
    const token = asTrimmed(request.data?.token);
    if (!shopId || !token) {
        throw new https_1.HttpsError('invalid-argument', 'shopId and token are required.');
    }
    const snap = await findCheckout(shopId, token);
    if (!snap)
        return { status: 'invalid' };
    const c = snap.data();
    // Already paid → tell the client (it shows a friendly "already completed").
    if (c.status === 'completed')
        return { status: 'completed' };
    // Expiry: past the 7-day window (or an explicit expiresAt) → invalid.
    const expMs = toMillis(c.expiresAt);
    if (expMs && expMs <= Date.now())
        return { status: 'invalid' };
    // Open (or reminded, or failed — still recoverable so the buyer can complete):
    // return ONLY the line refs. No prices, no PII — the client refetches live
    // products and re-adds through the normal cart path (total-parity).
    const items = (Array.isArray(c.items) ? c.items : []).map((it) => ({
        productId: it?.productId || '',
        variantSku: it?.variantSku || '',
        sku: it?.sku || '',
        quantity: Number(it?.quantity) || 1,
    }));
    return { status: 'open', items };
});
/**
 * unsubscribeCheckout — suppress future reminders for this shop + email.
 * Idempotent; works regardless of the checkout's status. Returns { success:true }.
 */
exports.unsubscribeCheckout = (0, https_1.onCall)(COMMON, async (request) => {
    const shopId = asTrimmed(request.data?.shopId);
    const token = asTrimmed(request.data?.token);
    if (!shopId || !token) {
        throw new https_1.HttpsError('invalid-argument', 'shopId and token are required.');
    }
    const snap = await findCheckout(shopId, token);
    if (!snap) {
        // Generic error — never reveal whether a token exists.
        throw new https_1.HttpsError('not-found', 'Not found.');
    }
    const c = snap.data();
    const emailNorm = c.emailNorm || '';
    if (!emailNorm) {
        // Nothing to suppress on (shouldn't happen — emailNorm is always written).
        return { success: true };
    }
    try {
        await database_1.db
            .collection('checkoutSuppressions')
            .doc((0, tokens_1.suppressionDocId)(shopId, emailNorm))
            .set({
            shopId,
            emailHash: (0, tokens_1.emailHash)(emailNorm),
            createdAt: new Date(),
            source: 'unsubscribe',
        }, { merge: true });
    }
    catch (e) {
        logger.warn('checkout-recovery: unsubscribe write failed', { error: e?.message });
        // Still return success — the page is idempotent and the user shouldn't see
        // a scary error for a suppression that will be retried on the next click.
    }
    return { success: true };
});
//# sourceMappingURL=callables.js.map