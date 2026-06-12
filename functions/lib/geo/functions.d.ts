/**
 * Geo-targeting Firebase Functions for B2C Shop
 * Provides CloudFlare geo data for currency detection
 * ONLY for allowed shop origins (B2B portal stays in SEK)
 */
/**
 * HTTP endpoint that returns CloudFlare geo data
 * Called from frontend to get user's location for currency detection
 */
export declare const getGeoData: import("firebase-functions/v2/https").HttpsFunction;
