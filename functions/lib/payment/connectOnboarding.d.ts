import Stripe from 'stripe';
declare function deriveStatus(acct: Stripe.Account): string;
declare function statusPatch(acct: Stripe.Account, existing: any): Record<string, any>;
interface ShopIdRequest {
    shopId: string;
}
export declare const createConnectAccount: import("firebase-functions/v2/https").CallableFunction<ShopIdRequest, any, unknown>;
export declare const createConnectAccountLink: import("firebase-functions/v2/https").CallableFunction<ShopIdRequest, any, unknown>;
export declare const refreshConnectStatus: import("firebase-functions/v2/https").CallableFunction<ShopIdRequest, any, unknown>;
export declare const createConnectLoginLink: import("firebase-functions/v2/https").CallableFunction<ShopIdRequest, any, unknown>;
interface SetCommissionRequest {
    shopId: string;
    commissionBps: number;
}
export declare const setShopCommission: import("firebase-functions/v2/https").CallableFunction<SetCommissionRequest, any, unknown>;
export declare const getConnectBalance: import("firebase-functions/v2/https").CallableFunction<ShopIdRequest, any, unknown>;
interface SetPayoutDelayRequest {
    shopId: string;
    delayDays: number | 'minimum';
}
export declare const setConnectPayoutDelay: import("firebase-functions/v2/https").CallableFunction<SetPayoutDelayRequest, any, unknown>;
export { deriveStatus, statusPatch };
