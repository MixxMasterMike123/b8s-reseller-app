/**
 * resolveCheckoutRecovery — rebuild the cart from an abandoned checkout.
 * Returns { status:'invalid' | 'completed' | 'open', items? }.
 */
export declare const resolveCheckoutRecovery: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    status: string;
    items?: undefined;
} | {
    status: string;
    items: any;
}>, unknown>;
/**
 * unsubscribeCheckout — suppress future reminders for this shop + email.
 * Idempotent; works regardless of the checkout's status. Returns { success:true }.
 */
export declare const unsubscribeCheckout: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
