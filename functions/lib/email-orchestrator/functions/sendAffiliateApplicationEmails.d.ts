interface AffiliateApplicationEmailsRequest {
    applicantInfo: {
        name: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        country?: string;
        promotionMethod?: string;
        message?: string;
        socials?: {
            website?: string;
            instagram?: string;
            youtube?: string;
            facebook?: string;
            tiktok?: string;
        };
    };
    applicationId: string;
    language?: string;
}
export declare const sendAffiliateApplicationEmails: import("firebase-functions/v2/https").CallableFunction<AffiliateApplicationEmailsRequest, any, unknown>;
export {};
