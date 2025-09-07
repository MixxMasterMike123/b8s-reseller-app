export interface AffiliateCredentialsData {
    appData: {
        name: string;
        email: string;
        preferredLang?: string;
    };
    affiliateCode: string;
    tempPassword: string;
    loginInstructions: string;
    wasExistingAuthUser: boolean;
}
export declare function getAffiliateCredentialsTemplate(data: AffiliateCredentialsData, language?: string): {
    subject: string;
    html: string;
};
