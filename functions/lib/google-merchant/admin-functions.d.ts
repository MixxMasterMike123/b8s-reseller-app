/**
 * Google Merchant Center Admin Functions
 *
 * Admin-only functions for managing Google Merchant Center integration.
 * These functions are used by the admin dashboard to monitor and control
 * the Google Shopping sync process.
 */
/**
 * Get Google Merchant Center account status and statistics
 */
export declare const getGoogleMerchantStats: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    error: string;
    details: string | undefined;
    stats?: undefined;
    lastUpdated?: undefined;
} | {
    success: boolean;
    stats: {
        account: any;
        firestore: {
            total: number;
            active: number;
            b2cAvailable: number;
            mappable: number;
        };
        google: {
            total: any;
            synced: any;
        };
        sync: {
            inSync: number;
            needsSync: number;
            syncPercentage: number;
        };
    };
    lastUpdated: string;
    error?: undefined;
    details?: undefined;
} | {
    success: boolean;
    error: any;
    details?: undefined;
    stats?: undefined;
    lastUpdated?: undefined;
}>, unknown>;
/**
 * Get detailed sync status for individual products
 */
export declare const getProductSyncStatus: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    products: {
        id: any;
        name: any;
        sku: any;
        isActive: any;
        b2cAvailable: any;
        status: string;
        message: string;
        offerId: string;
        isInGoogle: boolean;
        shouldBeInGoogle: boolean;
        googleProduct: any;
    }[];
    summary: Record<string, number>;
    pagination: {
        limit: any;
        offset: any;
        total: number;
        hasMore: boolean;
    };
    error?: undefined;
} | {
    success: boolean;
    error: any;
    products?: undefined;
    summary?: undefined;
    pagination?: undefined;
}>, unknown>;
/**
 * Force sync specific products by ID
 */
export declare const forceSyncProducts: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    results: ({
        productId: any;
        success: boolean;
        error: any;
        details: any;
    } | {
        productId: any;
        success: boolean;
        error: any;
        details?: undefined;
    })[];
    summary: {
        total: number;
        success: number;
        failures: number;
    };
    error?: undefined;
} | {
    success: boolean;
    error: any;
    results?: undefined;
    summary?: undefined;
}>, unknown>;
