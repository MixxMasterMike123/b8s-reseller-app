"use strict";
/**
 * Reverses affiliate commission when an order is cancelled or refunded.
 * Without this, affiliates keep (and can be paid out) commission on orders
 * that never shipped.
 *
 * P4.5b pairing note: this is INTENTIONALLY NOT gated on the affiliate add-on
 * flag. The award side (processB2COrderCompletionHttp) IS gated, so an order
 * placed while affiliate was OFF carries no `affiliateCommission` — and the
 * guard below (`!after.affiliateCommission`) already makes this a no-op for it.
 * Reverse-iff-awarded is the real pairing. Gating the reversal on the LIVE flag
 * would instead break it: award-while-ON → operator disables → cancel → the
 * commission would never be reversed and the affiliate would keep it for a
 * cancelled order. So we always reverse exactly what was actually awarded.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseAffiliateCommissionOnCancel = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const database_1 = require("../config/database");
const REVERSAL_STATUSES = ['cancelled', 'refunded'];
exports.reverseAffiliateCommissionOnCancel = (0, firestore_1.onDocumentUpdated)({
    document: 'orders/{orderId}',
    database: 'b8s-reseller-db',
    region: 'us-central1',
    memory: '256MiB'
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const becameReversed = !REVERSAL_STATUSES.includes(before.status) &&
        REVERSAL_STATUSES.includes(after.status);
    if (!becameReversed)
        return;
    if (!after.affiliateId || !after.affiliateCommission || after.commissionReversed)
        return;
    const orderId = event.params.orderId;
    const commission = after.affiliateCommission;
    console.log(`Reversing affiliate commission ${commission} for ${after.status} order ${orderId} (affiliate ${after.affiliateId})`);
    try {
        await database_1.db.runTransaction(async (tx) => {
            const orderRef = database_1.db.collection('orders').doc(orderId);
            const orderSnap = await tx.get(orderRef);
            if (!orderSnap.exists || orderSnap.data()?.commissionReversed)
                return;
            const affiliateRef = database_1.db.collection('affiliates').doc(after.affiliateId);
            const affiliateSnap = await tx.get(affiliateRef);
            if (affiliateSnap.exists) {
                tx.update(affiliateRef, {
                    'stats.balance': firestore_2.FieldValue.increment(-commission),
                    'stats.totalEarnings': firestore_2.FieldValue.increment(-commission),
                    'stats.conversions': firestore_2.FieldValue.increment(-1)
                });
            }
            tx.update(orderRef, {
                commissionReversed: true,
                commissionReversedAt: firestore_2.FieldValue.serverTimestamp()
            });
        });
        console.log(`✅ Commission reversed for order ${orderId}`);
    }
    catch (error) {
        console.error(`❌ Failed to reverse commission for order ${orderId}:`, error);
        throw error; // let the trigger retry
    }
});
//# sourceMappingURL=commissionReversal.js.map