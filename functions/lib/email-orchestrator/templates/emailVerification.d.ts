export interface EmailVerificationData {
    customerInfo: {
        firstName?: string;
        lastName?: string;
        name?: string;
        email: string;
    };
    verificationCode: string;
    language: string;
    source?: string;
}
export declare function generateEmailVerificationTemplate(data: EmailVerificationData): {
    subject: string;
    html: string;
};
