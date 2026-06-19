interface RefundRequest {
    orderId: string;
    amount?: number;
}
export declare const refundOrder: import("firebase-functions/v2/https").CallableFunction<RefundRequest, any, unknown>;
export {};
