/**
 * Google Merchant Center API Configuration
 * 
 * This module handles authentication and configuration for Google Merchant Center API.
 * Used to sync B8Shield products to Google Shopping.
 */

// Import statements for future use
import * as path from 'path';
import * as fs from 'fs';

// Google Merchant Center API configuration
export const MERCHANT_CONFIG = {
  // Your Google Merchant Center ID (you'll need to get this from Google Merchant Center)
  MERCHANT_ID: process.env.GOOGLE_MERCHANT_ID || '5351419444', // B8Shield Merchant Center ID
  
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
let serviceAccount: any = null;

export const getServiceAccount = () => {
  if (!serviceAccount) {
    try {
      const serviceAccountPath = MERCHANT_CONFIG.SERVICE_ACCOUNT_PATH;
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      } else {
        console.error('❌ Service account file not found:', serviceAccountPath);
        throw new Error('Service account file not found');
      }
    } catch (error) {
      console.error('❌ Failed to load service account:', error);
      throw error;
    }
  }
  return serviceAccount;
};

// Initialize Google Auth
import { GoogleAuth } from 'google-auth-library';

let googleAuth: GoogleAuth | null = null;

export const getGoogleAuth = () => {
  if (!googleAuth) {
    const serviceAccount = getServiceAccount();
    googleAuth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: MERCHANT_CONFIG.SCOPES
    });
  }
  return googleAuth;
};

// Get authenticated client
export const getAuthenticatedClient = async () => {
  const auth = getGoogleAuth();
  const authClient = await auth.getClient();
  return authClient;
};

// Product categories mapping for Google Shopping
export const GOOGLE_PRODUCT_CATEGORIES = {
  'fishing_lure_protection': 'Sporting Goods > Outdoor Recreation > Fishing > Fishing Tackle > Fishing Lures & Flies',
  'fishing_accessories': 'Sporting Goods > Outdoor Recreation > Fishing > Fishing Tackle',
  'outdoor_gear': 'Sporting Goods > Outdoor Recreation'
};

// B8Shield brand information
export const BRAND_INFO = {
  name: 'B8Shield',
  website: 'https://shop.b8shield.com',
  description: 'Innovativa vasskydd för dina fiskedrag',
  country: 'SE',
  currency: 'SEK'
};

// Shipping configuration for Google Shopping
export const SHIPPING_CONFIG = {
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
