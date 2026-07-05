"use strict";
// Abandoned-checkout recovery: the scheduled sweep. Every 15 minutes it:
//   1. purges checkouts older than 30 days (retention),
//   2. finds 'open' checkouts whose remindAt has passed, and
//   3. per doc (isolated try/catch so one failure never kills the batch),
//      re-checks every guard (order-now-exists race, consent, suppression,
//      supersede, frequency cap, feature flag, expiry) and, if clear, sends ONE
//      reminder email then marks the doc 'reminded'.
//
// All Firestore access is via the shared named-DB handle (config/database). The
// recovery + unsubscribe links are built from the canonical storefront base URL
// (appUrls.B2C_SHOP) + the path-prefix shop grammar (/{shopId}/aterta|avregistrera).
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
exports.sweepAbandonedCheckouts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const shopFeatures_1 = require("../config/shopFeatures");
const tokens_1 = require("./tokens");
const RETENTION_DAYS = 30;
const FREQUENCY_CAP_HOURS = 24;
const BATCH_LIMIT = 50;
function recoveryUrl(shopId, token) {
    const base = app_urls_1.appUrls.B2C_SHOP.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(shopId)}/aterta/${encodeURIComponent(token)}`;
}
function unsubscribeUrl(shopId, token) {
    const base = app_urls_1.appUrls.B2C_SHOP.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(shopId)}/avregistrera/${encodeURIComponent(token)}`;
}
function toMillis(v) {
    if (!v)
        return 0;
    if (typeof v.toMillis === 'function')
        return v.toMillis();
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
}
exports.sweepAbandonedCheckouts = (0, scheduler_1.onSchedule)({
    schedule: 'every 15 minutes',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
    secrets: ['RESEND_API_KEY'],
}, async () => {
    const now = Date.now();
    // ── 1) Retention purge: delete checkouts created > 30 days ago (any status).
    try {
        const cutoff = new Date(now - RETENTION_DAYS * 86400 * 1000);
        const stale = await database_1.db
            .collection('checkouts')
            .where('createdAt', '<=', cutoff)
            .limit(400)
            .get();
        if (!stale.empty) {
            const batch = database_1.db.batch();
            stale.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            firebase_functions_1.logger.info('checkout-recovery: purged stale checkouts', { count: stale.size });
        }
    }
    catch (e) {
        firebase_functions_1.logger.warn('checkout-recovery: retention purge failed', { error: e?.message });
    }
    // ── 2) Due 'open' checkouts whose remindAt has passed.
    let due;
    try {
        due = await database_1.db
            .collection('checkouts')
            .where('status', '==', 'open')
            .where('remindAt', '<=', new Date(now))
            .limit(BATCH_LIMIT)
            .get();
    }
    catch (e) {
        firebase_functions_1.logger.error('checkout-recovery: due query failed', { error: e?.message });
        return;
    }
    if (due.empty)
        return;
    let sent = 0;
    let skipped = 0;
    for (const docSnap of due.docs) {
        // Each iteration is fully isolated: one failing checkout must never abort
        // the rest of the batch.
        try {
            const c = docSnap.data();
            const ref = docSnap.ref;
            const shopId = c.shopId || '';
            const emailNorm = c.emailNorm || '';
            const piId = c.paymentIntentId || docSnap.id;
            if (!shopId || !emailNorm) {
                await ref.set({ status: 'skipped', suppressionReason: 'invalid_doc' }, { merge: true });
                skipped++;
                continue;
            }
            // Race guard: an order may already exist (webhook completed after we
            // queried), or the doc may have changed status. Mark completed / skip.
            const orderSnap = await database_1.db.collection('orders').doc(piId).get();
            if (orderSnap.exists) {
                await ref.set({ status: 'completed', completedAt: new Date() }, { merge: true });
                skipped++;
                continue;
            }
            // Re-read this doc's current status inside the loop (cheap consistency
            // check against a concurrent completion write).
            const fresh = await ref.get();
            if (fresh.data()?.status !== 'open') {
                skipped++;
                continue;
            }
            // Expiry: past the 7-day window → never remind.
            if (toMillis(c.expiresAt) && toMillis(c.expiresAt) <= now) {
                await ref.set({ status: 'skipped', suppressionReason: 'expired' }, { merge: true });
                skipped++;
                continue;
            }
            // Consent: neither marketing NOR the explicit remind-me opt-in → skip.
            const consent = c.consent || {};
            if (consent.marketing !== true && consent.remindMe !== true) {
                await ref.set({ status: 'skipped', suppressionReason: 'no_consent' }, { merge: true });
                skipped++;
                continue;
            }
            // Suppression: the buyer unsubscribed from reminders for this shop.
            const suppSnap = await database_1.db
                .collection('checkoutSuppressions')
                .doc((0, tokens_1.suppressionDocId)(shopId, emailNorm))
                .get();
            if (suppSnap.exists) {
                await ref.set({ status: 'skipped', suppressionReason: 'unsubscribed' }, { merge: true });
                skipped++;
                continue;
            }
            // Supersede: a NEWER open checkout for the same shop+email exists → skip
            // the OLD one (this doc). Only remind the latest cart.
            const newer = await database_1.db
                .collection('checkouts')
                .where('shopId', '==', shopId)
                .where('emailNorm', '==', emailNorm)
                .where('status', '==', 'open')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            const newestId = newer.empty ? null : newer.docs[0].id;
            if (newestId && newestId !== docSnap.id) {
                await ref.set({ status: 'skipped', suppressionReason: 'superseded' }, { merge: true });
                skipped++;
                continue;
            }
            // Frequency cap: a 'reminded' checkout for the same shop+email within the
            // last 24h → don't send another reminder now.
            const capCutoff = new Date(now - FREQUENCY_CAP_HOURS * 3600 * 1000);
            const recentReminded = await database_1.db
                .collection('checkouts')
                .where('shopId', '==', shopId)
                .where('emailNorm', '==', emailNorm)
                .where('status', '==', 'reminded')
                .where('remindedAt', '>=', capCutoff)
                .limit(1)
                .get();
            if (!recentReminded.empty) {
                await ref.set({ status: 'skipped', suppressionReason: 'frequency_cap' }, { merge: true });
                skipped++;
                continue;
            }
            // Add-on gate (default-ON): the shop must have the abandonedCheckout
            // feature enabled.
            const enabled = await (0, shopFeatures_1.isShopFeatureEnabled)(shopId, 'abandonedCheckout');
            if (!enabled) {
                await ref.set({ status: 'skipped', suppressionReason: 'feature_off' }, { merge: true });
                skipped++;
                continue;
            }
            // All guards passed → mark 'reminded' BEFORE sending (at-most-once: a
            // crash between mark and send loses one reminder instead of risking a
            // duplicate email — the legally safer failure mode). A clean transport
            // failure reverts to 'open' so a later sweep retries.
            const token = c.recoveryToken || '';
            await ref.set({ status: 'reminded', remindedAt: new Date() }, { merge: true });
            const { EmailOrchestrator } = await Promise.resolve().then(() => __importStar(require('../email-orchestrator/core/EmailOrchestrator')));
            const orchestrator = new EmailOrchestrator();
            let result = null;
            try {
                result = await orchestrator.sendEmail({
                    emailType: 'ABANDONED_CHECKOUT_REMINDER',
                    customerInfo: { email: c.customerEmail, name: c.customerName || '' },
                    language: c.language || 'sv-SE',
                    shopId,
                    additionalData: {
                        items: Array.isArray(c.items) ? c.items : [],
                        totals: c.totals || {},
                        recoveryUrl: recoveryUrl(shopId, token),
                        unsubscribeUrl: unsubscribeUrl(shopId, token),
                        customerFirstName: c.customerFirstName || '',
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
                // Transport failed (not a business-rule skip) → revert to 'open' so a
                // later sweep can retry.
                await ref.set({ status: 'open' }, { merge: true });
                firebase_functions_1.logger.warn('checkout-recovery: reminder send failed, reverted to open for retry', {
                    paymentIntentId: piId,
                    error: result?.error,
                });
            }
        }
        catch (perDocError) {
            firebase_functions_1.logger.warn('checkout-recovery: per-checkout error (batch continues)', {
                checkoutId: docSnap.id,
                error: perDocError?.message,
            });
        }
    }
    firebase_functions_1.logger.info('checkout-recovery: sweep complete', { due: due.size, sent, skipped });
});
//# sourceMappingURL=sweep.js.map