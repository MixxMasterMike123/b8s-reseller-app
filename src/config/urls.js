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
  // Primary domains (meteorpr platform). Env-overridable per deploy.
  // NOTE: FIREBASE_PROJECT_ID stays 'b8shield-reseller-app' — it's the
  // immutable project id the Functions URL derives from; renaming it breaks
  // the API. Only the human-facing hosting domains change to meteorpr.
  ADMIN_URL: env.VITE_PORTAL_URL || 'https://meteorpr.web.app',
  B2C_SHOP: env.VITE_SHOP_URL || 'https://shop-meteorpr.web.app',

  // Back-compat alias (some callers still read B2B_PORTAL).
  get B2B_PORTAL() { return this.ADMIN_URL; },

  // Default project hosting URL (admin site).
  B2B_LEGACY: 'https://meteorpr.web.app',

  // Asset URLs
  LOGO_URL: env.VITE_EMAIL_LOGO_URL || `${env.VITE_PORTAL_URL || 'https://meteorpr.web.app'}/images/logo.svg`,

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
  return APP_URLS.ADMIN_URL; // Default for server-side
};

// Helper function to get appropriate admin/portal URL based on current domain
export const getPortalUrl = () => {
  const currentDomain = getCurrentDomain();

  // On a *.web.app host (incl. the legacy project default), use the live origin.
  if (currentDomain.includes('.web.app')) {
    return currentDomain;
  }

  return APP_URLS.ADMIN_URL;
};

export default APP_URLS;
