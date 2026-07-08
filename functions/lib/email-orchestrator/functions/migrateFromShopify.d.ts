interface MigrateRequest {
    shopId: string;
    shopifyDomain: string;
    limit?: number;
}
export declare const migrateFromShopify: import("firebase-functions/v2/https").CallableFunction<MigrateRequest, any, unknown>;
export {};
