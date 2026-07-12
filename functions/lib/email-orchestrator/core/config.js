"use strict";
// EmailOrchestrator Configuration
// Centralized configuration for all email templates and URLs.
// Identity values are env-overridable (functions/.env.<project-id>) so a
// per-shop deploy needs no code edits; defaults are current staging values.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderTrackingUrl = exports.getSupportUrl = exports.formatPrice = exports.getLanguageSegment = exports.EMAIL_CONFIG = void 0;
const app_urls_1 = require("../../config/app-urls");
exports.EMAIL_CONFIG = {
    // Application URLs (single source: config/app-urls.ts)
    URLS: {
        B2B_PORTAL: app_urls_1.appUrls.B2B_PORTAL,
        B2C_SHOP: app_urls_1.appUrls.B2C_SHOP,
        PARTNER_URL: app_urls_1.appUrls.B2B_PORTAL,
        B2B_LEGACY: app_urls_1.appUrls.B2B_LEGACY,
        LOGO_URL: app_urls_1.appUrls.LOGO_URL,
    },
    // Email identity — PLATFORM defaults only. Per-shop emails override the
    // display name (shopName) and reply-to (supportEmail) via the orchestrator's
    // shopId threading; these values are the neutral fallback. The from ADDRESS
    // is always the platform's verified Resend sending domain.
    SMTP: {
        FROM_NAME: process.env.EMAIL_FROM_NAME || 'ChopShop',
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
};
// Storefront URLs are countryless now (Swedish-only; the /{countryCode} prefix
// was removed). `lang` is kept in these signatures for call-site compatibility
// but no longer maps to a URL segment.
// Deprecated: returns '' so any remaining `/${getLanguageSegment(lang)}/...`
// callers produce a countryless `//...` — but prefer building URLs without it.
// Kept to avoid breaking template imports; safe to delete once all templates
// drop it. (See the templates that still import it: passwordReset, loginCredentials.)
function getLanguageSegment(_lang) {
    return '';
}
exports.getLanguageSegment = getLanguageSegment;
// Helper function to format prices (V3 compatible)
function formatPrice(amount) {
    return `${amount.toFixed(0)} ${app_urls_1.commerceConfig.currency}`;
}
exports.formatPrice = formatPrice;
// Helper function to get support URL
function getSupportUrl(_lang) {
    return `${exports.EMAIL_CONFIG.URLS.B2C_SHOP}/contact`;
}
exports.getSupportUrl = getSupportUrl;
// Helper function to get order tracking URL
function getOrderTrackingUrl(orderId, _lang) {
    return `${exports.EMAIL_CONFIG.URLS.B2C_SHOP}/order-confirmation/${orderId}`;
}
exports.getOrderTrackingUrl = getOrderTrackingUrl;
//# sourceMappingURL=config.js.map