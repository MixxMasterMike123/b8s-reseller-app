export declare const sendCustomerWelcomeEmailV3: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    email: string;
    language: string;
    messageId: string;
}>, unknown>;
export declare const sendAffiliateWelcomeEmailV3: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    email: string;
    language: string;
    messageId: string;
}>, unknown>;
export declare const sendB2COrderPendingEmailV3: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    email: string;
    orderNumber: string;
    language: string;
    messageId: string;
}>, unknown>;
export declare const sendB2COrderNotificationAdminV3: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    orderNumber: string;
    language: string;
    messageIds: string[];
}>, unknown>;
export declare const sendB2BOrderConfirmationCustomerV3: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    email: string;
    orderNumber: string;
    language: string;
    messageId: string;
}>, unknown>;
export declare const sendOrderStatusEmailV3: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    email: string;
    orderNumber: string;
    newStatus: string;
    language: string;
    messageId: string;
}>, unknown>;
export declare const sendB2BOrderConfirmationAdminV3: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    orderNumber: string;
    language: string;
    messageIds: string[];
}>, unknown>;
