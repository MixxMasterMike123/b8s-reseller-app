interface AffiliateWelcomeRequest {
    affiliateInfo: {
        name: string;
        email: string;
        affiliateCode: string;
        commissionRate?: number;
        checkoutDiscount?: number;
        preferredLang?: string;
    };
    credentials: {
        email: string;
        temporaryPassword?: string;
    };
    wasExistingAuthUser?: boolean;
    language?: string;
}
export declare const sendAffiliateWelcomeEmail: import("firebase-functions/v2/https").CallableFunction<AffiliateWelcomeRequest, any, unknown>;
export {};
