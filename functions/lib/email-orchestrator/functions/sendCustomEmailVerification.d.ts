interface CustomEmailVerificationRequest {
    customerInfo: {
        firstName?: string;
        lastName?: string;
        name?: string;
        email: string;
        preferredLang?: string;
    };
    firebaseAuthUid: string;
    source?: string;
    language?: string;
}
export declare const sendCustomEmailVerification: import("firebase-functions/v2/https").CallableFunction<CustomEmailVerificationRequest, any, unknown>;
export {};
