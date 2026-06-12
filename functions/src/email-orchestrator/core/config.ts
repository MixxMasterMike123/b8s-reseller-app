// EmailOrchestrator Configuration
// Centralized configuration for all email templates and URLs.
// Identity values are env-overridable (functions/.env.<project-id>) so a
// per-shop deploy needs no code edits; defaults are current staging values.

import { appUrls, commerceConfig } from '../../config/app-urls';

export const EMAIL_CONFIG = {
  // Application URLs (single source: config/app-urls.ts)
  URLS: {
    B2B_PORTAL: appUrls.B2B_PORTAL,
    B2C_SHOP: appUrls.B2C_SHOP,
    PARTNER_URL: appUrls.B2B_PORTAL,
    B2B_LEGACY: appUrls.B2B_LEGACY,
    LOGO_URL: appUrls.LOGO_URL,
  },

  // Email identity
  SMTP: {
    FROM_NAME: process.env.EMAIL_FROM_NAME || 'B8Shield',
    FROM_EMAIL: process.env.EMAIL_FROM_EMAIL || process.env.SMTP_USER || 'b8shield.reseller@gmail.com',
    REPLY_TO: process.env.EMAIL_REPLY_TO || 'info@jphinnovation.se',
  },

  // Where admin notifications (new orders, affiliate applications) go.
  // Comma-separated list in ADMIN_NOTIFICATION_EMAILS.
  ADMIN_RECIPIENTS: (process.env.ADMIN_NOTIFICATION_EMAILS || 'info@jphinnovation.se,micke.ohlen@gmail.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  
  // Template settings
  TEMPLATES: {
    MAX_WIDTH: '600px',
    BORDER_RADIUS: '8px',
    FONT_FAMILY: "'Segoe UI', Arial, sans-serif",
  },
  
  // Font settings
  FONTS: {
    PRIMARY: "'Segoe UI', Arial, sans-serif",
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
    LINK: '#2563eb',
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

// Helper function to format prices (V3 compatible)
export function formatPrice(amount: number): string {
  return `${amount.toFixed(0)} ${commerceConfig.currency}`;
}

// Helper function to get support URL
export function getSupportUrl(lang: string): string {
  const segment = getLanguageSegment(lang);
  return `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/contact`;
}

// Helper function to get order tracking URL
export function getOrderTrackingUrl(orderId: string, lang: string): string {
  const segment = getLanguageSegment(lang);
  return `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/order-confirmation/${orderId}`;
}
