/**
 * Google Merchant Center API Configuration
 *
 * This module handles authentication and configuration for Google Merchant Center API.
 * Used to sync B8Shield products to Google Shopping.
 */
export declare const MERCHANT_CONFIG: {
    MERCHANT_ID: string;
    API_VERSION: string;
    BASE_URL: string;
    SCOPES: string[];
    SERVICE_ACCOUNT_PATH: string;
};
export declare const getServiceAccount: () => any;
import { GoogleAuth } from 'google-auth-library';
export declare const getGoogleAuth: () => GoogleAuth<import("google-auth-library").AuthClient>;
export declare const getAuthenticatedClient: () => Promise<import("google-auth-library").AnyAuthClient>;
export declare const GOOGLE_PRODUCT_CATEGORIES: {
    fishing_lure_protection: string;
    fishing_accessories: string;
    outdoor_gear: string;
};
export declare const BRAND_INFO: {
    name: string;
    website: string;
    description: string;
    country: string;
    currency: string;
};
export declare const SHIPPING_CONFIG: {
    sweden: {
        country: string;
        service: string;
        price: string;
        delivery_time: string;
    };
    nordic: {
        countries: string[];
        service: string;
        price: string;
        delivery_time: string;
    };
    eu: {
        region: string;
        service: string;
        price: string;
        delivery_time: string;
    };
};
