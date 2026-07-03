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

  // Email identity — PLATFORM defaults only. Per-shop emails override the
  // display name (shopName) and reply-to (supportEmail) via the orchestrator's
  // shopId threading; these values are the neutral fallback. The from ADDRESS
  // is always the platform's verified Resend sending domain.
  SMTP: {
    FROM_NAME: process.env.EMAIL_FROM_NAME || 'MeteorPR',
    FROM_EMAIL: process.env.EMAIL_FROM_EMAIL || 'no-reply@send.mohlenmedia.com',
    // Empty default = no reply-to header unless a shop supplies supportEmail
    // (or the env overrides). Never a brand-specific mailbox.
    REPLY_TO: process.env.EMAIL_REPLY_TO || '',
  },

  // Where admin notifications (new orders, affiliate applications) go.
  // Comma-separated list in ADMIN_NOTIFICATION_EMAILS.
  ADMIN_RECIPIENTS: (process.env.ADMIN_NOTIFICATION_EMAILS || 'micke.ohlen@gmail.com')
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

// Storefront URLs are countryless now (Swedish-only; the /{countryCode} prefix
// was removed). `lang` is kept in these signatures for call-site compatibility
// but no longer maps to a URL segment.

// Deprecated: returns '' so any remaining `/${getLanguageSegment(lang)}/...`
// callers produce a countryless `//...` — but prefer building URLs without it.
// Kept to avoid breaking template imports; safe to delete once all templates
// drop it. (See the templates that still import it: passwordReset, loginCredentials.)
export function getLanguageSegment(_lang?: string): string {
  return '';
}

// Helper function to format prices (V3 compatible)
export function formatPrice(amount: number): string {
  return `${amount.toFixed(0)} ${commerceConfig.currency}`;
}

// Helper function to get support URL
export function getSupportUrl(_lang?: string): string {
  return `${EMAIL_CONFIG.URLS.B2C_SHOP}/contact`;
}

// Helper function to get order tracking URL
export function getOrderTrackingUrl(orderId: string, _lang?: string): string {
  return `${EMAIL_CONFIG.URLS.B2C_SHOP}/order-confirmation/${orderId}`;
}
