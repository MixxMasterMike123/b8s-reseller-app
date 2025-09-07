interface LoginCredentialsRequest {
    userInfo: {
        name: string;
        email: string;
        companyName?: string;
        contactPerson?: string;
    };
    credentials: {
        email: string;
        temporaryPassword?: string;
        affiliateCode?: string;
    };
    accountType: 'B2B' | 'AFFILIATE';
    wasExistingAuthUser?: boolean;
    userId?: string;
    language?: string;
}
export declare const sendLoginCredentialsEmail: import("firebase-functions/v2/https").CallableFunction<LoginCredentialsRequest, any, unknown>;
export {};
