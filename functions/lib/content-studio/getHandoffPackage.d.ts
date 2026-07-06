interface HandoffRequest {
    postId: string;
    token: string;
}
export declare const getHandoffPackage: import("firebase-functions/v2/https").CallableFunction<HandoffRequest, any, unknown>;
export {};
