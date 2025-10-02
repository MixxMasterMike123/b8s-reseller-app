interface AffiliateApplicationReceivedData {
    applicantInfo: {
        name: string;
        email: string;
        phone?: string;
        promotionMethod?: string;
    };
    applicationId: string;
    language: string;
}
export declare function generateAffiliateApplicationReceivedTemplate(data: AffiliateApplicationReceivedData): string;
export {};
