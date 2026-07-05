"use strict";
// Native product reviews: the callables.
//
//  • resolveReviewRequest({ shopId, token }) — PUBLIC. The /{shopId}/recensera/
//    :token page calls this on mount to build the review form. Returns ONLY the
//    reviewable line refs + which products are already reviewed — NO PII.
//    Invalid → { status:'invalid' }; expired → { status:'expired' };
//    else → { status:'open', items, reviewedProductIds }.
//
//  • submitReview({ shopId, token, productId, rating, text, displayName,
//    anonymous }) — PUBLIC. Validates + writes ONE productReviews doc (per order
//    per product; deduped). A clean review auto-publishes (status 'approved') and
//    increments the product aggregate in a transaction; a flagged one goes to
//    'pending' (no aggregate change).
//
//  • unsubscribeReviews({ shopId, token }) — PUBLIC. Writes an idempotent
//    reviewSuppressions doc keyed on {shopId}_{sha256(emailNorm)} so future
//    review requests for this shop+email are suppressed.
//
//  • moderateReview({ reviewId, action }) — ADMIN-AUTH. A shop admin approves /
//    rejects a review of THEIR shop (platform super-admin: any shop). Adjusts the
//    product aggregate ONLY on a real status change. Auth idiom copied from the
//    project's requireAdminOfShop (email-orchestrator/functions/authGuard), the
//    same guard approveAffiliate + DAC7 use for Admin-SDK tenant isolation.
//
// All are tenant-scoped: the public callables key equality queries on BOTH shopId
// AND the raw token, so a token only resolves within its own shop.
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
exports.moderateReview = exports.unsubscribeReviews = exports.submitReview = exports.resolveReviewRequest = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const authGuard_1 = require("../email-orchestrator/functions/authGuard");
const tokens_1 = require("./tokens");
const contentFilter_1 = require("./contentFilter");
const COMMON = {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
};
const MAX_TEXT = 2000;
const MAX_NAME = 60;
function asTrimmed(v) {
    return typeof v === 'string' ? v.trim() : '';
}
function toMillis(v) {
    if (!v)
        return 0;
    if (typeof v.toMillis === 'function')
        return v.toMillis();
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
}
// Strip control chars + cap. Used for both review text and display name.
function sanitizeText(v, cap) {
    return asTrimmed(String(v ?? '').replace(/[\x00-\x1F\x7F]/g, '')).slice(0, cap);
}
// Resolve a single reviewRequests doc by (shopId, raw token). Null if none.
async function findRequest(shopId, token) {
    const q = await database_1.db
        .collection('reviewRequests')
        .where('shopId', '==', shopId)
        .where('token', '==', token)
        .limit(1)
        .get();
    return q.empty ? null : q.docs[0];
}
/**
 * resolveReviewRequest — build the review form from a review request.
 * Returns { status:'invalid' | 'expired' | 'open', items?, reviewedProductIds? }.
 */
exports.resolveReviewRequest = (0, https_1.onCall)(COMMON, async (request) => {
    const shopId = asTrimmed(request.data?.shopId);
    const token = asTrimmed(request.data?.token);
    if (!shopId || !token) {
        throw new https_1.HttpsError('invalid-argument', 'shopId and token are required.');
    }
    const snap = await findRequest(shopId, token);
    if (!snap)
        return { status: 'invalid' };
    const r = snap.data();
    if (toMillis(r.expiresAt) && toMillis(r.expiresAt) <= Date.now()) {
        return { status: 'expired' };
    }
    // Which products in this order already have a review (dedup + "done" UI).
    const reviewedProductIds = [];
    try {
        const existing = await database_1.db
            .collection('productReviews')
            .where('shopId', '==', shopId)
            .where('orderId', '==', r.orderId)
            .get();
        existing.docs.forEach((d) => {
            const pid = d.data()?.productId;
            if (pid)
                reviewedProductIds.push(pid);
        });
    }
    catch (e) {
        logger.warn('product-reviews: reviewedProductIds lookup failed', { error: e?.message });
    }
    const items = (Array.isArray(r.items) ? r.items : []).map((it) => ({
        productId: it?.productId || '',
        name: typeof it?.name === 'string' ? it.name : 'Produkt',
        image: typeof it?.image === 'string' ? it.image : undefined,
    }));
    return { status: 'open', items, reviewedProductIds };
});
/**
 * submitReview — validate + write ONE review, auto-publishing when clean.
 * Returns { ok:true, status:'approved'|'pending' }.
 */
exports.submitReview = (0, https_1.onCall)(COMMON, async (request) => {
    const data = request.data || {};
    // Payload size caps FIRST (cheap rejection of oversized junk).
    if (typeof data.text === 'string' && data.text.length > MAX_TEXT * 4) {
        throw new https_1.HttpsError('invalid-argument', 'Text too long.');
    }
    if (typeof data.displayName === 'string' && data.displayName.length > MAX_NAME * 4) {
        throw new https_1.HttpsError('invalid-argument', 'Name too long.');
    }
    const shopId = asTrimmed(data.shopId);
    const token = asTrimmed(data.token);
    const productId = asTrimmed(data.productId);
    if (!shopId || !token || !productId) {
        throw new https_1.HttpsError('invalid-argument', 'shopId, token and productId are required.');
    }
    const rating = data.rating;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new https_1.HttpsError('invalid-argument', 'rating must be an integer 1–5.');
    }
    const snap = await findRequest(shopId, token);
    if (!snap)
        throw new https_1.HttpsError('not-found', 'invalid');
    const r = snap.data();
    if (toMillis(r.expiresAt) && toMillis(r.expiresAt) <= Date.now()) {
        throw new https_1.HttpsError('failed-precondition', 'expired');
    }
    // The product must belong to this request's order.
    const reqItems = Array.isArray(r.items) ? r.items : [];
    if (!reqItems.some((it) => it?.productId === productId)) {
        throw new https_1.HttpsError('invalid-argument', 'Product not part of this order.');
    }
    const text = sanitizeText(data.text, MAX_TEXT);
    const anonymous = data.anonymous === true;
    const displayName = anonymous ? 'Anonym' : (sanitizeText(data.displayName, MAX_NAME) || 'Anonym');
    const flaggedReasons = (0, contentFilter_1.flagReviewText)(text);
    const status = flaggedReasons.length > 0 ? 'pending' : 'approved';
    // Dedup INSIDE the transaction via a deterministic doc id ({orderId}_{productId}):
    // a pre-transaction query would let two concurrent submits both pass and
    // double-increment the aggregate. tx.get + deterministic id makes the second
    // submit a true conflict.
    await database_1.db.runTransaction(async (tx) => {
        const reviewRef = database_1.db.collection('productReviews').doc(`${r.orderId}_${productId}`);
        const existing = await tx.get(reviewRef);
        if (existing.exists) {
            throw new https_1.HttpsError('already-exists', 'already-exists');
        }
        tx.set(reviewRef, {
            shopId,
            productId,
            orderId: r.orderId,
            rating,
            text,
            displayName,
            emailHash: (0, tokens_1.emailHash)(r.emailNorm || ''),
            verified: true,
            status,
            ...(flaggedReasons.length > 0 ? { flaggedReasons } : {}),
            createdAt: new Date(),
        });
        // Aggregate: only approved reviews count.
        if (status === 'approved') {
            const productRef = database_1.db.collection('products').doc(productId);
            tx.set(productRef, {
                reviewCount: firestore_1.FieldValue.increment(1),
                ratingSum: firestore_1.FieldValue.increment(rating),
            }, { merge: true });
        }
    });
    return { ok: true, status };
});
/**
 * unsubscribeReviews — suppress future review requests for this shop + email.
 * Idempotent; generic errors (never reveal whether a token exists).
 */
exports.unsubscribeReviews = (0, https_1.onCall)(COMMON, async (request) => {
    const shopId = asTrimmed(request.data?.shopId);
    const token = asTrimmed(request.data?.token);
    if (!shopId || !token) {
        throw new https_1.HttpsError('invalid-argument', 'shopId and token are required.');
    }
    // Unknown token → same success response (no token-validity oracle;
    // suppression is a no-op we can't perform, and the caller learns nothing).
    const snap = await findRequest(shopId, token);
    if (!snap)
        return { success: true };
    const r = snap.data();
    const emailNorm = r.emailNorm || '';
    if (!emailNorm)
        return { success: true };
    try {
        await database_1.db
            .collection('reviewSuppressions')
            .doc((0, tokens_1.suppressionDocId)(shopId, emailNorm))
            .set({
            shopId,
            emailHash: (0, tokens_1.emailHash)(emailNorm),
            createdAt: new Date(),
            source: 'unsubscribe',
        }, { merge: true });
    }
    catch (e) {
        logger.warn('product-reviews: unsubscribe write failed', { error: e?.message });
    }
    return { success: true };
});
/**
 * moderateReview — a shop admin approves / rejects one review of their shop.
 * ADMIN-AUTH via requireAdminOfShop (tenant isolation: the review's OWN shopId is
 * the trustworthy source — never a caller-supplied field). The aggregate delta is
 * applied ONLY on a real status change, so double-clicking is a no-op.
 */
exports.moderateReview = (0, https_1.onCall)(COMMON, async (request) => {
    const reviewId = asTrimmed(request.data?.reviewId);
    const action = asTrimmed(request.data?.action);
    if (!reviewId || (action !== 'approve' && action !== 'reject')) {
        throw new https_1.HttpsError('invalid-argument', 'reviewId and a valid action are required.');
    }
    const reviewRef = database_1.db.collection('productReviews').doc(reviewId);
    const snap = await reviewRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Review not found.');
    }
    const review = snap.data();
    // Tenant isolation: derive shopId from the RESOURCE, not the request payload.
    await (0, authGuard_1.requireAdminOfShop)(review.shopId, request.auth?.uid);
    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    await database_1.db.runTransaction(async (tx) => {
        // Re-read INSIDE the transaction — the pre-transaction snapshot is only for
        // auth. Two concurrent moderations computing deltas from the same stale
        // prevStatus would double-apply to the aggregate.
        const fresh = await tx.get(reviewRef);
        if (!fresh.exists) {
            throw new https_1.HttpsError('not-found', 'Review not found.');
        }
        const current = fresh.data();
        const prevStatus = current.status;
        const rating = Number(current.rating) || 0;
        const productId = current.productId;
        // Only a real status change touches the aggregate.
        let countDelta = 0;
        let sumDelta = 0;
        if (prevStatus !== nextStatus) {
            if (prevStatus === 'approved' && nextStatus === 'rejected') {
                countDelta = -1;
                sumDelta = -rating;
            }
            else if ((prevStatus === 'pending' || prevStatus === 'rejected') && nextStatus === 'approved') {
                countDelta = 1;
                sumDelta = rating;
            }
        }
        tx.set(reviewRef, {
            status: nextStatus,
            moderatedAt: new Date(),
            moderatedBy: request.auth?.uid || 'system',
        }, { merge: true });
        if ((countDelta !== 0 || sumDelta !== 0) && productId) {
            const productRef = database_1.db.collection('products').doc(productId);
            tx.set(productRef, {
                reviewCount: firestore_1.FieldValue.increment(countDelta),
                ratingSum: firestore_1.FieldValue.increment(sumDelta),
            }, { merge: true });
        }
    });
    return { ok: true, status: nextStatus };
});
//# sourceMappingURL=callables.js.map