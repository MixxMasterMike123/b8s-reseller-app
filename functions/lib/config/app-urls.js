"use strict";
// Platform Configuration — single source of truth for URLs, identity and
// commerce defaults used by Cloud Functions.
//
// Every value is env-overridable so a per-shop deploy is pure configuration
// (set in functions/.env.<project-id>). Defaults are the current staging
// values, so deploying without env changes keeps working exactly as before.
Object.defineProperty(exports, "__esModule", { value: true });
exports.commerceConfig = exports.adminSeedConfig = exports.appUrls = void 0;
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'b8shield-reseller-app';
exports.appUrls = {
    // Primary domains
    B2B_PORTAL: process.env.APP_PORTAL_URL || 'https://partner.b8shield.com',
    B2C_SHOP: process.env.APP_SHOP_URL || 'https://shop.b8shield.com',
    // Hosting default domain for this project (works on any deploy)
    B2B_LEGACY: `https://${projectId}.web.app`,
    // Asset URLs
    LOGO_URL: process.env.EMAIL_LOGO_URL ||
        `${process.env.APP_PORTAL_URL || 'https://partner.b8shield.com'}/images/B8S_logo.png`,
    // CORS allowed origins (shop + portal + project hosting + local dev,
    // plus any comma-separated extras from CORS_EXTRA_ORIGINS)
    get CORS_ORIGINS() {
        const extras = (process.env.CORS_EXTRA_ORIGINS || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return [
            this.B2C_SHOP,
            this.B2B_PORTAL,
            this.B2B_LEGACY,
            `https://shop-b8shield.web.app`,
            // meteorpr surfaces (the live hosting targets) — admin, storefront, and the
            // platform operator console. The platform host is required so the operator
            // console's callables (e.g. createShopUser) aren't CORS-rejected.
            'https://meteorpr.web.app',
            'https://shop-meteorpr.web.app',
            'https://platform-meteorpr.web.app',
            'http://localhost:5173',
            'http://localhost:3000',
            ...extras
        ];
    },
    // User Agent for outbound API calls
    getUserAgent: () => `${exports.commerceConfig.shopName}/1.0 (${exports.appUrls.B2B_PORTAL})`
};
// Seed admin login used by the createAdminUser maintenance endpoint
exports.adminSeedConfig = {
    email: process.env.ADMIN_SEED_EMAIL || 'micke.ohlen@gmail.com'
};
// Commerce defaults — per-shop, env-overridable
exports.commerceConfig = {
    shopName: process.env.SHOP_NAME || 'B8Shield',
    // Prefix for human-readable order numbers, e.g. B8S-123456-AB12
    orderNumberPrefix: process.env.ORDER_NUMBER_PREFIX || 'B8S',
    // VAT rate as a fraction (0.25 = 25%)
    vatRate: parseFloat(process.env.VAT_RATE || '0.25'),
    // ISO currency code for charges
    currency: (process.env.SHOP_CURRENCY || 'SEK').toUpperCase()
};
//# sourceMappingURL=app-urls.js.map