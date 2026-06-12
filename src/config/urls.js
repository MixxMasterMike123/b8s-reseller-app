// URL Configuration — single source of truth for all platform URLs.
//
// Every value is env-overridable (VITE_*) so a per-shop deploy is pure
// configuration. Defaults are the current staging values, so building
// without a .env keeps working exactly as before.

const env = import.meta.env || {};

// Firebase project the deploy talks to. The Cloud Functions base URL is
// DERIVED from this — never hardcode a *.cloudfunctions.net URL anywhere.
const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'b8shield-reseller-app';
const FUNCTIONS_REGION = env.VITE_FUNCTIONS_REGION || 'us-central1';

export const APP_URLS = {
  // Primary domains
  B2B_PORTAL: env.VITE_PORTAL_URL || 'https://partner.b8shield.com',
  B2C_SHOP: env.VITE_SHOP_URL || 'https://shop.b8shield.com',

  // Legacy domain (keep for backward compatibility)
  B2B_LEGACY: `https://${FIREBASE_PROJECT_ID}.web.app`,

  // Asset URLs
  LOGO_URL: env.VITE_EMAIL_LOGO_URL || `${env.VITE_PORTAL_URL || 'https://partner.b8shield.com'}/images/B8S_logo.png`,

  // API endpoints (derived from project + region)
  FIREBASE_FUNCTIONS_BASE: `https://${FUNCTIONS_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`,

  // Email template URLs
  getPortalUrl: () => APP_URLS.B2B_PORTAL,
  getLogoUrl: () => APP_URLS.LOGO_URL,
  getShopUrl: () => APP_URLS.B2C_SHOP,
};

// Build a Cloud Functions endpoint URL: functionUrl('createPaymentIntentV2')
export const functionUrl = (name) => `${APP_URLS.FIREBASE_FUNCTIONS_BASE}/${name}`;

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

  // If we're on the *.web.app domain, return that URL
  if (currentDomain.includes(`${FIREBASE_PROJECT_ID}.web.app`)) {
    return APP_URLS.B2B_LEGACY;
  }

  return APP_URLS.B2B_PORTAL;
};

export default APP_URLS;
