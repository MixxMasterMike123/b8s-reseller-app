interface AffiliateApprovalRequest {
    applicationId: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    socials?: {
        [key: string]: string;
    };
    promotionMethod?: string;
    message?: string;
    checkoutDiscount?: number;
}
export declare const approveAffiliate: import("firebase-functions/v2/https").CallableFunction<AffiliateApprovalRequest, any, unknown>;
export {};
