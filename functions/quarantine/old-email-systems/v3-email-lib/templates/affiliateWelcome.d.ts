export interface AffiliateWelcomeData {
    appData: {
        name: string;
        email: string;
    };
    affiliateCode: string;
    tempPassword?: string;
    loginInstructions: string;
    wasExistingAuthUser: boolean;
}
export declare function getAffiliateWelcomeTemplate(data: AffiliateWelcomeData, lang?: string): {
    subject: string;
    html: string;
};
