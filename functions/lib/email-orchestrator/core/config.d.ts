export declare const EMAIL_CONFIG: {
    readonly URLS: {
        readonly B2B_PORTAL: "https://partner.b8shield.com";
        readonly B2C_SHOP: "https://shop.b8shield.com";
        readonly PARTNER_URL: "https://partner.b8shield.com";
        readonly B2B_LEGACY: "https://b8shield-reseller-app.web.app";
        readonly LOGO_URL: "https://partner.b8shield.com/images/B8S_logo.png";
    };
    readonly SMTP: {
        readonly FROM_NAME: "B8Shield";
        readonly FROM_EMAIL: "b8shield.reseller@gmail.com";
        readonly REPLY_TO: "info@jphinnovation.se";
    };
    readonly TEMPLATES: {
        readonly MAX_WIDTH: "600px";
        readonly BORDER_RADIUS: "8px";
        readonly FONT_FAMILY: "'Segoe UI', Arial, sans-serif";
    };
    readonly FONTS: {
        readonly PRIMARY: "'Segoe UI', Arial, sans-serif";
    };
    readonly COLORS: {
        readonly PRIMARY: "#1d4ed8";
        readonly SUCCESS: "#059669";
        readonly WARNING: "#f59e0b";
        readonly BACKGROUND: "#f9fafb";
        readonly TEXT_PRIMARY: "#1f2937";
        readonly TEXT_SECONDARY: "#374151";
        readonly TEXT_MUTED: "#6b7280";
        readonly BORDER: "#e5e7eb";
        readonly LINK: "#2563eb";
    };
    readonly LANGUAGES: {
        readonly DEFAULT: "sv-SE";
        readonly SUPPORTED: readonly ["sv-SE", "en-GB", "en-US"];
    };
};
export declare function getLanguageSegment(lang: string): string;
export declare function formatPrice(amount: number): string;
export declare function getSupportUrl(lang: string): string;
export declare function getOrderTrackingUrl(orderId: string, lang: string): string;
