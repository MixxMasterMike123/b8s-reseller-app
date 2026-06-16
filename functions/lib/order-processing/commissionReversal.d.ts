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
export declare const reverseAffiliateCommissionOnCancel: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    orderId: string;
}>>;
