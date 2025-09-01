"use strict";
// Configuration for V3 email system
// URL management for password reset links and backlinks
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageSegment = exports.APP_URLS = void 0;
exports.APP_URLS = {
    // Primary domains
    B2B_PORTAL: 'https://partner.b8shield.com',
    B2C_SHOP: 'https://shop.b8shield.com',
    // Legacy domain (keep for backward compatibility)
    B2B_LEGACY: 'https://b8shield-reseller-app.web.app',
    // Asset URLs
    LOGO_URL: 'https://partner.b8shield.com/images/B8S_logo.png',
};
// Helper function to get language segment for URLs
function getLanguageSegment(lang) {
    if (lang.startsWith('en'))
        return lang === 'en-GB' ? 'gb' : 'us';
    return 'se';
}
exports.getLanguageSegment = getLanguageSegment;
//# sourceMappingURL=config.js.map