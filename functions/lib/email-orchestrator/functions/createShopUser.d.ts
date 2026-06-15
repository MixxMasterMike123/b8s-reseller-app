interface CreateShopUserRequest {
    shopId: string;
    email: string;
    name?: string;
}
export declare const createShopUser: import("firebase-functions/v2/https").CallableFunction<CreateShopUserRequest, any, unknown>;
export {};
