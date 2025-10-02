"use strict";
/**
 * Google Merchant Center API Configuration
 *
 * This module handles authentication and configuration for Google Merchant Center API.
 * Used to sync B8Shield products to Google Shopping.
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
exports.SHIPPING_CONFIG = exports.BRAND_INFO = exports.GOOGLE_PRODUCT_CATEGORIES = exports.getAuthenticatedClient = exports.getGoogleAuth = exports.getServiceAccount = exports.MERCHANT_CONFIG = void 0;
// Import statements for future use
var path = require("path");
var fs = require("fs");
// Google Merchant Center API configuration
exports.MERCHANT_CONFIG = {
    // Your Google Merchant Center ID (you'll need to get this from Google Merchant Center)
    MERCHANT_ID: process.env.GOOGLE_MERCHANT_ID || '5351419444',
    // API version
    API_VERSION: 'v2',
    // Base API URL (Google Shopping Content API)
    BASE_URL: 'https://shoppingcontent.googleapis.com',
    // Scopes required for Merchant API
    SCOPES: [
        'https://www.googleapis.com/auth/content'
    ],
    // Service account key path
    SERVICE_ACCOUNT_PATH: path.join(__dirname, '../../merchant-service-account.json')
};
// Load service account credentials
var serviceAccount = null;
var getServiceAccount = function () {
    if (!serviceAccount) {
        try {
            var serviceAccountPath = exports.MERCHANT_CONFIG.SERVICE_ACCOUNT_PATH;
            if (fs.existsSync(serviceAccountPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            }
            else {
                console.error('❌ Service account file not found:', serviceAccountPath);
                throw new Error('Service account file not found');
            }
        }
        catch (error) {
            console.error('❌ Failed to load service account:', error);
            throw error;
        }
    }
    return serviceAccount;
};
exports.getServiceAccount = getServiceAccount;
// Initialize Google Auth
var google_auth_library_1 = require("google-auth-library");
var googleAuth = null;
var getGoogleAuth = function () {
    if (!googleAuth) {
        var serviceAccount_1 = (0, exports.getServiceAccount)();
        googleAuth = new google_auth_library_1.GoogleAuth({
            credentials: serviceAccount_1,
            scopes: exports.MERCHANT_CONFIG.SCOPES
        });
    }
    return googleAuth;
};
exports.getGoogleAuth = getGoogleAuth;
// Get authenticated client
var getAuthenticatedClient = function () { return __awaiter(void 0, void 0, void 0, function () {
    var auth, authClient;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                auth = (0, exports.getGoogleAuth)();
                return [4 /*yield*/, auth.getClient()];
            case 1:
                authClient = _a.sent();
                return [2 /*return*/, authClient];
        }
    });
}); };
exports.getAuthenticatedClient = getAuthenticatedClient;
// Product categories mapping for Google Shopping
exports.GOOGLE_PRODUCT_CATEGORIES = {
    'fishing_lure_protection': 'Sporting Goods > Outdoor Recreation > Fishing > Fishing Tackle > Fishing Lures & Flies',
    'fishing_accessories': 'Sporting Goods > Outdoor Recreation > Fishing > Fishing Tackle',
    'outdoor_gear': 'Sporting Goods > Outdoor Recreation'
};
// B8Shield brand information
exports.BRAND_INFO = {
    name: 'B8Shield',
    website: 'https://shop.b8shield.com',
    description: 'Innovativa vasskydd för dina fiskedrag',
    country: 'SE',
    currency: 'SEK'
};
// Shipping configuration for Google Shopping
exports.SHIPPING_CONFIG = {
    sweden: {
        country: 'SE',
        service: 'Standard',
        price: '29 SEK',
        delivery_time: '3-5 business days'
    },
    nordic: {
        countries: ['NO', 'DK', 'FI'],
        service: 'Nordic',
        price: '49 SEK',
        delivery_time: '5-7 business days'
    },
    eu: {
        region: 'EU',
        service: 'EU',
        price: '79 SEK',
        delivery_time: '7-14 business days'
    }
};
