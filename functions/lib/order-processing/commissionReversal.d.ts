/**
 * Reverses affiliate commission when an order is cancelled or refunded.
 * Without this, affiliates keep (and can be paid out) commission on orders
 * that never shipped.
 */
export declare const reverseAffiliateCommissionOnCancel: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    orderId: string;
}>>;
