"use strict";
/**
 * Geo-targeting Firebase Functions for B2C Shop
 * Provides CloudFlare geo data for currency detection
 * ONLY for shop.b8shield.com (B2B portal stays in SEK)
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.testGeoHeaders = exports.getGeoData = void 0;
var https_1 = require("firebase-functions/v2/https");
/**
 * HTTP endpoint that returns CloudFlare geo data
 * Called from frontend to get user's location for currency detection
 */
exports.getGeoData = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    memory: '128MiB',
    timeoutSeconds: 30
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var origin_1, isShopDomain, cfCountry, cfRegion, cfCity, clientIP, geoData;
    return __generator(this, function (_a) {
        try {
            origin_1 = req.headers.origin || req.headers.referer;
            isShopDomain = origin_1 === null || origin_1 === void 0 ? void 0 : origin_1.includes('shop.b8shield.com');
            if (!isShopDomain) {
                console.log("Geo data request from non-shop domain: ".concat(origin_1));
                res.status(403).json({
                    success: false,
                    error: 'Geo data only available for B2C shop'
                });
                return [2 /*return*/];
            }
            console.log('Getting geo data from CloudFlare headers for B2C shop...');
            cfCountry = req.headers['cf-ipcountry'];
            cfRegion = req.headers['cf-ipcontinent'];
            cfCity = req.headers['cf-ipcity'];
            clientIP = req.headers['cf-connecting-ip'] ||
                req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress;
            geoData = {
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
        return [2 /*return*/];
    });
}); });
/**
 * Test endpoint to check CloudFlare headers
 * Useful for debugging geo-targeting setup
 */
exports.testGeoHeaders = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    memory: '128MiB',
    timeoutSeconds: 30
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var cfHeaders_1, otherHeaders, testData;
    return __generator(this, function (_a) {
        try {
            console.log('Testing CloudFlare geo headers...');
            cfHeaders_1 = {};
            Object.keys(req.headers).forEach(function (key) {
                if (key.toLowerCase().startsWith('cf-')) {
                    cfHeaders_1[key] = req.headers[key];
                }
            });
            otherHeaders = {
                'x-forwarded-for': req.headers['x-forwarded-for'],
                'user-agent': req.headers['user-agent'],
                'accept-language': req.headers['accept-language']
            };
            testData = {
                timestamp: Date.now(),
                cloudflareHeaders: cfHeaders_1,
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
        return [2 /*return*/];
    });
}); });
