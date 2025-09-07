interface PasswordResetRequest {
    email: string;
    resetCode: string;
    userAgent?: string;
    timestamp?: string;
    userType?: 'B2B' | 'B2C' | 'AFFILIATE';
    language?: string;
}
export declare const sendPasswordResetEmail: import("firebase-functions/v2/https").CallableFunction<PasswordResetRequest, any, unknown>;
export {};
