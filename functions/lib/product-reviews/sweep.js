"use strict";
// Native product reviews: the scheduled sweep. Every 60 minutes it:
//   1. finds 'scheduled' reviewRequests whose dueAt has passed, and
//   2. per doc (isolated try/catch so one failure never kills the batch),
//      re-checks every guard (expiry, feature flag, suppression, order-now-
//      cancelled) and, if clear, marks 'sent' BEFORE sending ONE request email.
//      A clean transport failure reverts to 'scheduled' so a later sweep retries.
//   3. optionally purges very old sent/expired requests (retention).
//
// All Firestore access is via the shared named-DB handle (config/database). The
// review + unsubscribe links are built from the canonical storefront base URL
// (appUrls.B2C_SHOP) + the path-prefix shop grammar
// (/{shopId}/recensera|avregistrera-recensioner).
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
exports.sweepReviewRequests = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const shopFeatures_1 = require("../config/shopFeatures");
const tokens_1 = require("./tokens");
const BATCH_LIMIT = 50;
const PURGE_DAYS = 200;
function reviewUrl(shopId, token) {
    const base = app_urls_1.appUrls.B2C_SHOP.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(shopId)}/recensera/${encodeURIComponent(token)}`;
}
function unsubscribeUrl(shopId, token) {
    const base = app_urls_1.appUrls.B2C_SHOP.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(shopId)}/avregistrera-recensioner/${encodeURIComponent(token)}`;
}
function toMillis(v) {
    if (!v)
        return 0;
    if (typeof v.toMillis === 'function')
        return v.toMillis();
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
}
// Defensive i18n-name flatten (the trigger already stored flat strings, but a
// legacy doc might not have — never send an "[object Object]").
function flattenName(name) {
    if (typeof name === 'string')
        return name;
    if (name && typeof name === 'object') {
        return name['sv-SE'] || name['en-GB'] || name['en-US'] ||
            Object.values(name).find((v) => typeof v === 'string') || '';
    }
    return '';
}
exports.sweepReviewRequests = (0, scheduler_1.onSchedule)({
    schedule: 'every 60 minutes',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
    secrets: ['RESEND_API_KEY'],
}, async () => {
    const now = Date.now();
    // ── Retention purge: delete sent/expired requests older than PURGE_DAYS.
    try {
        const cutoff = new Date(now - PURGE_DAYS * 86400 * 1000);
        const stale = await database_1.db
            .collection('reviewRequests')
            .where('createdAt', '<=', cutoff)
            .limit(400)
            .get();
        if (!stale.empty) {
            const batch = database_1.db.batch();
            let n = 0;
            stale.docs.forEach((d) => {
                const st = d.data()?.status;
                if (st === 'sent' || st === 'expired' || st === 'skipped') {
                    batch.delete(d.ref);
                    n++;
                }
            });
            if (n > 0) {
                await batch.commit();
                firebase_functions_1.logger.info('product-reviews: purged stale review requests', { count: n });
            }
        }
    }
    catch (e) {
        firebase_functions_1.logger.warn('product-reviews: retention purge failed', { error: e?.message });
    }
    // ── Due 'scheduled' requests whose dueAt has passed.
    let due;
    try {
        due = await database_1.db
            .collection('reviewRequests')
            .where('status', '==', 'scheduled')
            .where('dueAt', '<=', new Date(now))
            .limit(BATCH_LIMIT)
            .get();
    }
    catch (e) {
        firebase_functions_1.logger.error('product-reviews: due query failed', { error: e?.message });
        return;
    }
    if (due.empty)
        return;
    let sent = 0;
    let skipped = 0;
    for (const docSnap of due.docs) {
        // Each iteration is fully isolated: one failing request must never abort
        // the rest of the batch.
        try {
            const r = docSnap.data();
            const ref = docSnap.ref;
            const shopId = r.shopId || '';
            const emailNorm = r.emailNorm || '';
            const orderId = r.orderId || docSnap.id;
            if (!shopId || !emailNorm) {
                await ref.set({ status: 'skipped', suppressionReason: 'invalid_doc' }, { merge: true });
                skipped++;
                continue;
            }
            // Expiry: past the 180-day window → never send.
            if (toMillis(r.expiresAt) && toMillis(r.expiresAt) <= now) {
                await ref.set({ status: 'expired', suppressionReason: 'expired' }, { merge: true });
                skipped++;
                continue;
            }
            // Add-on gate (default-ON): the shop must have productReviews enabled.
            const enabled = await (0, shopFeatures_1.isShopFeatureEnabled)(shopId, 'productReviews');
            if (!enabled) {
                await ref.set({ status: 'skipped', suppressionReason: 'feature_off' }, { merge: true });
                skipped++;
                continue;
            }
            // Suppression: the buyer unsubscribed from review requests for this shop.
            const suppSnap = await database_1.db
                .collection('reviewSuppressions')
                .doc((0, tokens_1.suppressionDocId)(shopId, emailNorm))
                .get();
            if (suppSnap.exists) {
                await ref.set({ status: 'skipped', suppressionReason: 'unsubscribed' }, { merge: true });
                skipped++;
                continue;
            }
            // Order re-check: don't request a review for an order that was cancelled
            // or refunded after it qualified (or that vanished).
            const orderSnap = await database_1.db.collection('orders').doc(orderId).get();
            const orderStatus = orderSnap.exists ? orderSnap.data()?.status : null;
            if (!orderSnap.exists || orderStatus === 'cancelled' || orderStatus === 'refunded') {
                await ref.set({ status: 'skipped', suppressionReason: 'cancelled' }, { merge: true });
                skipped++;
                continue;
            }
            // All guards passed → mark 'sent' BEFORE sending (at-most-once: a crash
            // between mark and send loses one request instead of risking a duplicate
            // email). A clean transport failure reverts to 'scheduled' for retry.
            const token = r.token || '';
            await ref.set({ status: 'sent', sentAt: new Date() }, { merge: true });
            const items = (Array.isArray(r.items) ? r.items : []).map((it) => ({
                productId: it?.productId || '',
                name: flattenName(it?.name) || 'Produkt',
                image: typeof it?.image === 'string' ? it.image : undefined,
            }));
            const { EmailOrchestrator } = await Promise.resolve().then(() => __importStar(require('../email-orchestrator/core/EmailOrchestrator')));
            const orchestrator = new EmailOrchestrator();
            let result = null;
            try {
                result = await orchestrator.sendEmail({
                    emailType: 'REVIEW_REQUEST',
                    customerInfo: { email: r.customerEmail, name: r.customerFirstName || '' },
                    language: r.language || 'sv-SE',
                    shopId,
                    additionalData: {
                        items,
                        reviewUrl: reviewUrl(shopId, token),
                        unsubscribeUrl: unsubscribeUrl(shopId, token),
                        customerFirstName: r.customerFirstName || '',
                    },
                });
            }
            catch (sendError) {
                result = { success: false, error: sendError?.message };
            }
            if (result?.success) {
                sent++;
            }
            else {
                // Transport failed (not a business-rule skip) → revert to 'scheduled'
                // so a later sweep can retry.
                await ref.set({ status: 'scheduled', sentAt: null }, { merge: true });
                firebase_functions_1.logger.warn('product-reviews: request send failed, reverted to scheduled for retry', {
                    orderId,
                    error: result?.error,
                });
            }
        }
        catch (perDocError) {
            firebase_functions_1.logger.warn('product-reviews: per-request error (batch continues)', {
                requestId: docSnap.id,
                error: perDocError?.message,
            });
        }
    }
    firebase_functions_1.logger.info('product-reviews: sweep complete', { due: due.size, sent, skipped });
});
//# sourceMappingURL=sweep.js.map