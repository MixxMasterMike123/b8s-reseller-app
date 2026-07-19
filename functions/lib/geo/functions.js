"use strict";
/**
 * Geo-targeting Firebase Functions for B2C Shop
 * Provides CloudFlare geo data for currency detection
 * ONLY for allowed shop origins (B2B portal stays in SEK)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeoData = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_urls_1 = require("../config/app-urls");
/**
 * HTTP endpoint that returns CloudFlare geo data
 * Called from frontend to get user's location for currency detection
 */
exports.getGeoData = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    memory: '128MiB',
    timeoutSeconds: 30
}, async (req, res) => {
    try {
        // Only serve geo data for B2C shop domain
        const origin = req.headers.origin || req.headers.referer;
        // origin may be a bare Origin OR a full referer URL (with path); reduce a
        // referer to its origin before matching. Honours static list + custom-domain
        // regex via appUrls.isAllowedOrigin (RegExp elements can't be .startsWith'd).
        let originHost;
        if (origin) {
            try {
                originHost = new URL(origin).origin;
            }
            catch {
                originHost = origin;
            }
        }
        const isShopDomain = app_urls_1.appUrls.isAllowedOrigin(originHost);
        if (!isShopDomain) {
            console.log(`Geo data request from non-shop domain: ${origin}`);
            res.status(403).json({
                success: false,
                error: 'Geo data only available for B2C shop'
            });
            return;
        }
        console.log('Getting geo data from CloudFlare headers for B2C shop...');
        // Get CloudFlare headers (if available)
        const cfCountry = req.headers['cf-ipcountry'];
        const cfRegion = req.headers['cf-ipcontinent'];
        const cfCity = req.headers['cf-ipcity'];
        // Get IP address for fallback geo lookup
        const clientIP = req.headers['cf-connecting-ip'] ||
            req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress;
        // Build geo data response
        const geoData = {
            country: cfCountry || 'SE',
            region: cfRegion || 'EU',
            city: cfCity || 'Stockholm',
            ip: clientIP,
            timestamp: Date.now(),
            source: cfCountry ? 'cloudflare' : 'fallback',
            headers: {
                'cf-ipcountry': cfCountry,
                'cf-ipcontinent': cfRegion,
                'cf-ipcity': cfCity,
                'cf-connecting-ip': req.headers['cf-connecting-ip'],
                'x-forwarded-for': req.headers['x-forwarded-for']
            }
        };
        console.log('Geo data response:', geoData);
        // Set cache headers (5 minutes)
        res.set({
            'Cache-Control': 'public, max-age=300',
            'Content-Type': 'application/json'
        });
        res.status(200).json({
            success: true,
            data: geoData
        });
    }
    catch (error) {
        console.error('Error getting geo data:', error);
        // Return fallback data on error
        res.status(200).json({
            success: false,
            error: error.message,
            data: {
                country: 'SE',
                region: 'EU',
                city: 'Stockholm',
                timestamp: Date.now(),
                source: 'error-fallback'
            }
        });
    }
});
//# sourceMappingURL=functions.js.map