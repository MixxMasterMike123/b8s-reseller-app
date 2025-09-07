export interface WelcomeCredentialsData {
    customerData: {
        companyName: string;
        contactPerson: string;
        email: string;
    };
    temporaryPassword: string;
}
export declare function getWelcomeCredentialsTemplate(data: WelcomeCredentialsData, lang?: string): {
    subject: string;
    html: string;
};
