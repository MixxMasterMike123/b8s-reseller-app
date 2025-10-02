interface AffiliateApplicationAdminData {
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
    adminPortalUrl: string;
}
export declare function generateAffiliateApplicationNotificationAdminTemplate(data: AffiliateApplicationAdminData): string;
export {};
