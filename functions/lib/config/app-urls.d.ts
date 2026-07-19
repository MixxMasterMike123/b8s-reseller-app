export declare const appUrls: {
    B2B_PORTAL: string;
    B2C_SHOP: string;
    B2B_LEGACY: string;
    ADMIN_BASE: string;
    LOGO_URL: string;
    readonly CORS_ORIGINS: (string | RegExp)[];
    isAllowedOrigin(origin: string | undefined | null): boolean;
    getUserAgent: () => string;
};
export declare const adminSeedConfig: {
    email: string;
};
export declare const commerceConfig: {
    shopName: string;
    orderNumberPrefix: string;
    vatRate: number;
    currency: string;
    defaultCommissionBps: number;
};
