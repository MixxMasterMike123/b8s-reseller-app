interface SetPrintJobStatusRequest {
    orderId: string;
    action: 'printed' | 'shipped';
    trackingNumber?: string;
}
export declare const setPrintJobStatus: import("firebase-functions/v2/https").CallableFunction<SetPrintJobStatusRequest, any, unknown>;
export {};
