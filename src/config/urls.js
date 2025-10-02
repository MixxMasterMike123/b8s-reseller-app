// B8Shield URL Configuration
// Centralized management of all domain URLs

export const APP_URLS = {
  // Primary domains
  B2B_PORTAL: 'https://partner.b8shield.com',
  B2C_SHOP: 'https://shop.b8shield.com',
  
  // Legacy domain (keep for backward compatibility)
  B2B_LEGACY: 'https://b8shield-reseller-app.web.app',
  
  // Asset URLs
  LOGO_URL: 'https://partner.b8shield.com/images/B8S_logo.png',
  
  // API endpoints
  FIREBASE_FUNCTIONS_BASE: 'https://us-central1-b8shield-reseller-app.cloudfunctions.net',
  
  // Email template URLs
  getPortalUrl: () => APP_URLS.B2B_PORTAL,
  getLogoUrl: () => APP_URLS.LOGO_URL,
  getShopUrl: () => APP_URLS.B2C_SHOP,
};

// Helper function to detect current environment
export const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return APP_URLS.B2B_PORTAL; // Default for server-side
};

// Helper function to get appropriate portal URL based on current domain
export const getPortalUrl = () => {
  const currentDomain = getCurrentDomain();
  
  // If we're on legacy domain, return legacy URL
  if (currentDomain.includes('b8shield-reseller-app.web.app')) {
    return APP_URLS.B2B_LEGACY;
  }
  
  // Otherwise return new partner domain
  return APP_URLS.B2B_PORTAL;
};

export default APP_URLS; 