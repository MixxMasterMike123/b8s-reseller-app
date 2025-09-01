// Configuration for V3 email system
// URL management for password reset links and backlinks

export const APP_URLS = {
  // Primary domains
  B2B_PORTAL: 'https://partner.b8shield.com',
  B2C_SHOP: 'https://shop.b8shield.com',
  PARTNER_URL: 'https://partner.b8shield.com',
  
  // Legacy domain (keep for backward compatibility)
  B2B_LEGACY: 'https://b8shield-reseller-app.web.app',
  
  // Asset URLs
  LOGO_URL: 'https://partner.b8shield.com/images/B8S_logo.png',
} as const;

// Helper function to get language segment for URLs
export function getLanguageSegment(lang: string): string {
  if (lang.startsWith('en')) return lang === 'en-GB' ? 'gb' : 'us';
  return 'se';
}
