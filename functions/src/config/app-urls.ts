// Firebase Functions Configuration
// Centralized URL management for Firebase Functions

export const appUrls = {
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
    'https://b8shield-reseller-app.web.app',
    'http://localhost:5173',  // Development
    'http://localhost:3000'   // Development
  ] as const,
  
  // User Agent for API calls
  getUserAgent: () => `B8Shield-FishTrip-Wagon/1.0 (${appUrls.B2B_PORTAL}; info@jphinnovation.se)`,
} as const;

export type AppUrl = typeof appUrls.CORS_ORIGINS[number]; 