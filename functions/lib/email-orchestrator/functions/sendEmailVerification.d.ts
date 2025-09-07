interface EmailVerificationRequest {
    customerInfo: {
        firstName?: string;
        lastName?: string;
        name?: string;
        email: string;
        preferredLang?: string;
    };
    verificationCode: string;
    source?: string;
    language?: string;
}
export declare const sendEmailVerification: import("firebase-functions/v2/https").CallableFunction<EmailVerificationRequest, any, unknown>;
export {};
