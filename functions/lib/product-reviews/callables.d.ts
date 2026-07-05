/**
 * resolveReviewRequest — build the review form from a review request.
 * Returns { status:'invalid' | 'expired' | 'open', items?, reviewedProductIds? }.
 */
export declare const resolveReviewRequest: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    status: string;
    items?: undefined;
    reviewedProductIds?: undefined;
} | {
    status: string;
    items: any;
    reviewedProductIds: string[];
}>, unknown>;
/**
 * submitReview — validate + write ONE review, auto-publishing when clean.
 * Returns { ok:true, status:'approved'|'pending' }.
 */
export declare const submitReview: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    ok: boolean;
    status: string;
}>, unknown>;
/**
 * unsubscribeReviews — suppress future review requests for this shop + email.
 * Idempotent; generic errors (never reveal whether a token exists).
 */
export declare const unsubscribeReviews: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * moderateReview — a shop admin approves / rejects one review of their shop.
 * ADMIN-AUTH via requireAdminOfShop (tenant isolation: the review's OWN shopId is
 * the trustworthy source — never a caller-supplied field). The aggregate delta is
 * applied ONLY on a real status change, so double-clicking is a no-op.
 */
export declare const moderateReview: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    ok: boolean;
    status: string;
}>, unknown>;
