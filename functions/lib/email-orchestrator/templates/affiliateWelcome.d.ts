export interface AffiliateWelcomeData {
    affiliateInfo: {
        name: string;
        email: string;
        affiliateCode: string;
        commissionRate?: number;
        checkoutDiscount?: number;
    };
    credentials: {
        email: string;
        temporaryPassword?: string;
    };
    wasExistingAuthUser: boolean;
    language: string;
}
export declare function generateAffiliateWelcomeTemplate(data: AffiliateWelcomeData): {
    subject: string;
    html: string;
};
