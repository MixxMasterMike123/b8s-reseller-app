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
    // "Portal" = where provisioned admins log in — the admin console. (The old
    // partner.b8shield.com default leaked a dead brand domain into emails.)
    B2B_PORTAL: process.env.APP_PORTAL_URL || 'https://meteorpr.web.app',
    B2C_SHOP: process.env.APP_SHOP_URL || 'https://shop-meteorpr.web.app',
    // Hosting default domain for this project (works on any deploy)
    B2B_LEGACY: `https://${projectId}.web.app`,
    // Admin console base URL — used for Stripe Connect Account Link return/refresh
    // redirects (shop owner returns here after Stripe-hosted onboarding).
    ADMIN_BASE: process.env.ADMIN_BASE_URL || 'https://meteorpr.web.app',
    // Asset URLs. Empty default = emails render a text brand header instead of
    // an <img> (there is no platform logo; per-shop logos are a later slice).
    LOGO_URL: process.env.EMAIL_LOGO_URL || '',
    // CORS allowed origins (shop + portal + project hosting + local dev,
    // plus any comma-separated extras from CORS_EXTRA_ORIGINS).
    //
    // CUSTOM DOMAINS (Cloudflare-for-SaaS slice): a storefront served on a shop's
    // OWN domain still calls the SAME Firebase callables, so the browser sends that
    // domain as the Origin header and it must be allow-listed or the call is CORS-
    // rejected. The set of live custom domains is DYNAMIC (Firestore domainMappings)
    // and cannot be enumerated at cold-start, while `cors` is resolved once per
    // instance. firebase-functions v2 `cors` accepts `RegExp | Array<string|RegExp>`,
    // so the seam is a REGEX, not a per-domain list: set CORS_CUSTOM_DOMAIN_REGEX to
    // a pattern matching your live custom-domain origins (e.g. the tenant apexes you
    // sell). Callables spread CORS_ORIGINS which now includes that RegExp when set.
    // Absent the env, behaviour is unchanged (no custom-domain origins allowed).
    get CORS_ORIGINS() {
        const extras = (process.env.CORS_EXTRA_ORIGINS || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const customRe = process.env.CORS_CUSTOM_DOMAIN_REGEX
            ? [new RegExp(process.env.CORS_CUSTOM_DOMAIN_REGEX)]
            : [];
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
            // print-shop portal — its callables (getPrintQueue/getPrintJob/…) are
            // CORS-rejected without this origin.
            'https://print-meteorpr.web.app',
            'http://localhost:5173',
            'http://localhost:3000',
            ...extras,
            ...customRe // custom-domain origins (RegExp), empty unless env is set
        ];
    },
    // Predicate form for MANUAL CORS handlers (onRequest endpoints that echo the
    // Origin header themselves — geo/functions.ts, protection/cors-handler.ts).
    // Those can't hand a RegExp to a string .includes()/.startsWith(), so they ask
    // here instead. Honours the same static list + custom-domain regex as
    // CORS_ORIGINS, so custom domains work uniformly across callable and onRequest.
    isAllowedOrigin(origin) {
        if (!origin)
            return false;
        for (const o of this.CORS_ORIGINS) {
            if (typeof o === 'string') {
                if (origin === o)
                    return true;
            }
            else if (o.test(origin)) {
                return true;
            }
        }
        return false;
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
    shopName: process.env.SHOP_NAME || 'ChopShop',
    // Prefix for human-readable order numbers, e.g. ORD-123456-AB12. Changing
    // it only affects NEW orders; lookups (withdrawal etc.) match the stored
    // string, so old B8S-… numbers keep resolving.
    orderNumberPrefix: process.env.ORDER_NUMBER_PREFIX || 'ORD',
    // VAT rate as a fraction (0.25 = 25%)
    vatRate: parseFloat(process.env.VAT_RATE || '0.25'),
    // ISO currency code for charges
    currency: (process.env.SHOP_CURRENCY || 'SEK').toUpperCase(),
    // Stripe Connect: the PLATFORM's default cut, in BASIS POINTS (500 = 5.00%).
    // Effective rate per sale = shops/{id}.payments.commissionBps
    //   ?? settings/platform.defaultCommissionBps ?? this env default.
    // Basis points (integer) avoid float drift and match Stripe's integer
    // minor-unit fee math (see functions/src/payment/connectFee.ts).
    defaultCommissionBps: parseInt(process.env.PLATFORM_DEFAULT_COMMISSION_BPS || '500', 10)
};
//# sourceMappingURL=app-urls.js.map