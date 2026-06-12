/**
 * Validates an affiliate/discount code for the storefront cart.
 * Replaces the client-side `affiliates` collection query, which would expose
 * affiliate PII (email, earnings) to anonymous visitors under locked-down
 * Firestore rules. Returns only what checkout needs.
 */
interface ValidateDiscountCodeRequest {
    code: string;
}
export declare const validateDiscountCode: import("firebase-functions/v2/https").CallableFunction<ValidateDiscountCodeRequest, any, unknown>;
export {};
