interface DeleteCustomerData {
    customerId: string;
}
interface DeleteB2CCustomerData {
    customerId: string;
}
interface ToggleCustomerStatusData {
    customerId: string;
    activeStatus: boolean;
}
export declare const deleteCustomerAccount: import("firebase-functions/v2/https").CallableFunction<DeleteCustomerData, any, unknown>;
export declare const deleteB2CCustomerAccount: import("firebase-functions/v2/https").CallableFunction<DeleteB2CCustomerData, any, unknown>;
export declare const toggleCustomerActiveStatus: import("firebase-functions/v2/https").CallableFunction<ToggleCustomerStatusData, any, unknown>;
export declare const createAdminUser: import("firebase-functions/v2/https").HttpsFunction;
export declare const checkNamedDatabase: import("firebase-functions/v2/https").HttpsFunction;
export declare const debugDatabase: import("firebase-functions/v2/https").HttpsFunction;
export {};
