interface RequestReq {
    shopId: string;
    hostname: string;
}
export declare const requestCustomDomain: import("firebase-functions/v2/https").CallableFunction<RequestReq, any, unknown>;
interface CheckReq {
    shopId: string;
}
export declare const checkCustomDomainStatus: import("firebase-functions/v2/https").CallableFunction<CheckReq, any, unknown>;
interface RemoveReq {
    shopId: string;
}
export declare const removeCustomDomain: import("firebase-functions/v2/https").CallableFunction<RemoveReq, any, unknown>;
export {};
