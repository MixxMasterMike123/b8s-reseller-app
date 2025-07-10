export declare const appUrls: {
    readonly B2B_PORTAL: "https://partner.b8shield.com";
    readonly B2C_SHOP: "https://shop.b8shield.com";
    readonly B2B_LEGACY: "https://b8shield-reseller-app.web.app";
    readonly LOGO_URL: "https://partner.b8shield.com/images/B8S_logo.png";
    readonly CORS_ORIGINS: readonly ["https://partner.b8shield.com", "https://shop.b8shield.com", "https://b8shield-reseller-app.web.app", "http://localhost:5173", "http://localhost:3000"];
    readonly getUserAgent: () => string;
};
export type AppUrl = typeof appUrls.CORS_ORIGINS[number];
