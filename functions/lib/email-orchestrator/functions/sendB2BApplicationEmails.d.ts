interface B2BApplicationEmailsRequest {
    applicantInfo: {
        name: string;
        email: string;
        companyName: string;
        contactPerson: string;
        phone?: string;
        orgNumber?: string;
        vatNumber?: string;
    };
    applicationId: string;
    language?: string;
}
export declare const sendB2BApplicationEmails: import("firebase-functions/v2/https").CallableFunction<B2BApplicationEmailsRequest, any, unknown>;
export {};
