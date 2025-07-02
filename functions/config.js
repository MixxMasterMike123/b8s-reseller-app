// Firebase Functions Configuration
// Centralized URL management for Firebase Functions

const APP_URLS = {
  // Primary domains
  B2B_PORTAL: 'https://partner.b8shield.com',
  B2C_SHOP: 'https://shop.b8shield.com',
  
  // Legacy domain (keep for backward compatibility)
  B2B_LEGACY: 'https://b8shield-reseller-app.web.app',
  
  // Asset URLs
  LOGO_URL: 'https://partner.b8shield.com/images/B8S_logo.png',
  
  // CORS allowed origins
  CORS_ORIGINS: [
    'https://partner.b8shield.com',
    'https://shop.b8shield.com',
    'https://b8shield-reseller-app.web.app'
  ],
  
  // User Agent for API calls
  getUserAgent: () => `B8Shield-FishTrip-Wagon/1.0 (${APP_URLS.B2B_PORTAL}; info@b8shield.com)`,
};

module.exports = APP_URLS; 