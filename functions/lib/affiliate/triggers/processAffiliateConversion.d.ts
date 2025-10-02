/**
 * DEPRECATED: Process affiliate conversion (Firestore trigger)
 * This trigger is no longer reliable due to named database limitations.
 * It has been replaced by the processB2COrderCompletion callable function.
 * Keeping for reference and pattern consistency.
 */
export declare const processAffiliateConversionV2: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    orderId: string;
}>>;
