declare global {
    var orderRateLimit: Map<string, number[]>;
    var bulkModeTracker: Map<string, {
        enabled: boolean;
        enabledAt: number;
        requestTimes: number[];
    }>;
}
/**
 * [V2] HTTP endpoint for B2C order processing with affiliate commission handling
 */
export declare const processB2COrderCompletionHttp: import("firebase-functions/v2/https").HttpsFunction;
/**
 * Core order-completion logic shared by the HTTP endpoint and the Stripe
 * webhook (called directly, no mock req/res). Idempotent: the order is
 * claimed in a transaction before any side effects (emails, customer stats,
 * affiliate commission) run.
 */
export declare function processOrderCompletion(orderId: string): Promise<{
    statusCode: number;
    body: Record<string, unknown>;
}>;
