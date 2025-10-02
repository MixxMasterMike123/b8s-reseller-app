export interface LoginCredentialsData {
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
    wasExistingAuthUser: boolean;
}
export declare function generateLoginCredentialsTemplate(data: LoginCredentialsData, lang?: string): {
    subject: string;
    html: string;
};
