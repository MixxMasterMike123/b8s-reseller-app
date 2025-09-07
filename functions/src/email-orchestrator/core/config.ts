// EmailOrchestrator Configuration
// Centralized configuration for all email templates and URLs

export const EMAIL_CONFIG = {
  // Application URLs
  URLS: {
    B2B_PORTAL: 'https://partner.b8shield.com',
    B2C_SHOP: 'https://shop.b8shield.com',
    PARTNER_URL: 'https://partner.b8shield.com',
    B2B_LEGACY: 'https://b8shield-reseller-app.web.app',
    LOGO_URL: 'https://partner.b8shield.com/images/B8S_logo.png',
  },
  
  // Email settings
  SMTP: {
    FROM_NAME: 'B8Shield',
    FROM_EMAIL: 'b8shield.reseller@gmail.com',
    REPLY_TO: 'info@jphinnovation.se',
  },
  
  // Template settings
  TEMPLATES: {
    MAX_WIDTH: '600px',
    BORDER_RADIUS: '8px',
    FONT_FAMILY: "'Segoe UI', Arial, sans-serif",
  },
  
  // Brand colors
  COLORS: {
    PRIMARY: '#1d4ed8',
    SUCCESS: '#059669', 
    WARNING: '#f59e0b',
    BACKGROUND: '#f9fafb',
    TEXT_PRIMARY: '#1f2937',
    TEXT_SECONDARY: '#374151',
    TEXT_MUTED: '#6b7280',
    BORDER: '#e5e7eb',
  },
  
  // Language settings
  LANGUAGES: {
    DEFAULT: 'sv-SE',
    SUPPORTED: ['sv-SE', 'en-GB', 'en-US'],
  },
} as const;

// Helper function to get language segment for URLs
export function getLanguageSegment(lang: string): string {
  if (lang.startsWith('en')) return lang === 'en-GB' ? 'gb' : 'us';
  return 'se';
}

// Helper function to format prices
export function formatPrice(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} kr`;
}

// Helper function to get support URL
export function getSupportUrl(lang: string): string {
  const segment = getLanguageSegment(lang);
  return `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/contact`;
}

// Helper function to get order tracking URL
export function getOrderTrackingUrl(orderNumber: string, lang: string): string {
  const segment = getLanguageSegment(lang);
  return `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/order-status?order=${orderNumber}`;
}
