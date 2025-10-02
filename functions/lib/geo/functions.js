"use strict";
/**
 * Geo-targeting Firebase Functions for B2C Shop
 * Provides CloudFlare geo data for currency detection
 * ONLY for shop.b8shield.com (B2B portal stays in SEK)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGeoHeaders = exports.getGeoData = void 0;
const https_1 = require("firebase-functions/v2/https");
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
        const isShopDomain = origin?.includes('shop.b8shield.com');
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
/**
 * Test endpoint to check CloudFlare headers
 * Useful for debugging geo-targeting setup
 */
exports.testGeoHeaders = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    memory: '128MiB',
    timeoutSeconds: 30
}, async (req, res) => {
    try {
        console.log('Testing CloudFlare geo headers...');
        // Get all CloudFlare headers
        const cfHeaders = {};
        Object.keys(req.headers).forEach(key => {
            if (key.toLowerCase().startsWith('cf-')) {
                cfHeaders[key] = req.headers[key];
            }
        });
        // Get other relevant headers
        const otherHeaders = {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'user-agent': req.headers['user-agent'],
            'accept-language': req.headers['accept-language']
        };
        const testData = {
            timestamp: Date.now(),
            cloudflareHeaders: cfHeaders,
            otherHeaders: otherHeaders,
            allHeaders: req.headers,
            hasCloudFlareGeo: !!req.headers['cf-ipcountry'],
            detectedCountry: req.headers['cf-ipcountry'] || 'UNKNOWN'
        };
        console.log('CloudFlare test data:', testData);
        res.status(200).json({
            success: true,
            message: 'CloudFlare geo headers test',
            data: testData
        });
    }
    catch (error) {
        console.error('Error testing geo headers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
//# sourceMappingURL=functions.js.map