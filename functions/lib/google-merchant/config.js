"use strict";
/**
 * Google Merchant Center API Configuration
 *
 * This module handles authentication and configuration for Google Merchant Center API.
 * Used to sync B8Shield products to Google Shopping.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHIPPING_CONFIG = exports.BRAND_INFO = exports.GOOGLE_PRODUCT_CATEGORIES = exports.getAuthenticatedClient = exports.getGoogleAuth = exports.getServiceAccount = exports.MERCHANT_CONFIG = void 0;
// Import statements for future use
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Google Merchant Center API configuration
exports.MERCHANT_CONFIG = {
    // Your Google Merchant Center ID (you'll need to get this from Google Merchant Center)
    MERCHANT_ID: process.env.GOOGLE_MERCHANT_ID || '5351419444',
    // API version
    API_VERSION: 'v2.1',
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
let serviceAccount = null;
const getServiceAccount = () => {
    if (!serviceAccount) {
        try {
            const serviceAccountPath = exports.MERCHANT_CONFIG.SERVICE_ACCOUNT_PATH;
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
const google_auth_library_1 = require("google-auth-library");
let googleAuth = null;
const getGoogleAuth = () => {
    if (!googleAuth) {
        const serviceAccount = (0, exports.getServiceAccount)();
        googleAuth = new google_auth_library_1.GoogleAuth({
            credentials: serviceAccount,
            scopes: exports.MERCHANT_CONFIG.SCOPES
        });
    }
    return googleAuth;
};
exports.getGoogleAuth = getGoogleAuth;
// Get authenticated client
const getAuthenticatedClient = async () => {
    const auth = (0, exports.getGoogleAuth)();
    const authClient = await auth.getClient();
    return authClient;
};
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
//# sourceMappingURL=config.js.map