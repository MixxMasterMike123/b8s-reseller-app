interface DeleteCustomerData {
    customerId: string;
}
interface DeleteB2CCustomerData {
    customerId: string;
}
interface ToggleCustomerStatusData {
    customerId: string;
    activeStatus: boolean;
}
export declare const deleteCustomerAccount: import("firebase-functions/v2/https").CallableFunction<DeleteCustomerData, any, unknown>;
export declare const deleteB2CCustomerAccount: import("firebase-functions/v2/https").CallableFunction<DeleteB2CCustomerData, any, unknown>;
export declare const toggleCustomerActiveStatus: import("firebase-functions/v2/https").CallableFunction<ToggleCustomerStatusData, any, unknown>;
export declare const createAdminUser: import("firebase-functions/v2/https").HttpsFunction;
/**
 * Maintenance endpoint: syncs the `role: admin` custom auth claim from the
 * users collection (named DB) onto Firebase Auth users. Storage rules cannot
 * read the named Firestore database (cross-service rules only support
 * (default)), so storage admin checks use this custom claim instead of a
 * hardcoded UID allowlist. Guarded by ADMIN_MAINTENANCE_SECRET (fail-closed).
 * Admins must re-login (or wait up to 1h for token refresh) after syncing.
 */
export declare const syncAdminClaims: import("firebase-functions/v2/https").HttpsFunction;
export {};
