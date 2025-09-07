"use strict";
// EmailOrchestrator Configuration
// Centralized configuration for all email templates and URLs
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderTrackingUrl = exports.getSupportUrl = exports.formatPrice = exports.getLanguageSegment = exports.EMAIL_CONFIG = void 0;
exports.EMAIL_CONFIG = {
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
};
// Helper function to get language segment for URLs
function getLanguageSegment(lang) {
    if (lang.startsWith('en'))
        return lang === 'en-GB' ? 'gb' : 'us';
    return 'se';
}
exports.getLanguageSegment = getLanguageSegment;
// Helper function to format prices
function formatPrice(amount) {
    return `${amount.toFixed(2).replace('.', ',')} kr`;
}
exports.formatPrice = formatPrice;
// Helper function to get support URL
function getSupportUrl(lang) {
    const segment = getLanguageSegment(lang);
    return `${exports.EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/contact`;
}
exports.getSupportUrl = getSupportUrl;
// Helper function to get order tracking URL
function getOrderTrackingUrl(orderNumber, lang) {
    const segment = getLanguageSegment(lang);
    return `${exports.EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/order-status?order=${orderNumber}`;
}
exports.getOrderTrackingUrl = getOrderTrackingUrl;
//# sourceMappingURL=config.js.map