/**
 * Google Merchant Center Sync Functions
 *
 * Firebase Functions for syncing B8Shield products to Google Shopping.
 * Handles both manual sync and automated triggers.
 */
/**
 * Manual sync all products to Google Merchant Center
 * Callable function for admin use
 */
export declare const syncAllProductsToGoogle: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
    stats: {
        total: number;
        synced: number;
        skipped: number;
        errors: number;
    };
    details?: undefined;
    error?: undefined;
} | {
    success: boolean;
    message: string;
    stats: {
        total: number;
        synced: number;
        skipped: number;
        errors: number;
    };
    details: import("./api-client").MerchantApiResponse<any>[];
    error?: undefined;
} | {
    success: boolean;
    error: any;
    details: any;
    message?: undefined;
    stats?: undefined;
}>, unknown>;
/**
 * HTTP endpoint for manual sync (for admin dashboard)
 */
export declare const syncProductsToGoogleHttp: import("firebase-functions/v2/https").HttpsFunction;
/**
 * Sync single product to Google Merchant Center
 */
export declare const syncSingleProductToGoogle: import("firebase-functions/v2/https").CallableFunction<any, Promise<import("./api-client").MerchantApiResponse<import("./api-client").ProductInsertResponse> | {
    success: boolean;
    error: any;
}>, unknown>;
/**
 * Test Google Merchant Center connection
 */
export declare const testGoogleMerchantConnection: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    error: string;
    details: string | undefined;
    message?: undefined;
    account?: undefined;
    sampleProducts?: undefined;
} | {
    success: boolean;
    message: string;
    account: any;
    sampleProducts: any;
    error?: undefined;
    details?: undefined;
} | {
    success: boolean;
    error: any;
    details?: undefined;
    message?: undefined;
    account?: undefined;
    sampleProducts?: undefined;
}>, unknown>;
/**
 * Firestore Trigger: Auto-sync when product is created
 */
export declare const onProductCreated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    productId: string;
}>>;
/**
 * Firestore Trigger: Auto-sync when product is updated
 */
export declare const onProductUpdated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    productId: string;
}>>;
/**
 * Firestore Trigger: Auto-remove when product is deleted
 */
export declare const onProductDeleted: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    productId: string;
}>>;
