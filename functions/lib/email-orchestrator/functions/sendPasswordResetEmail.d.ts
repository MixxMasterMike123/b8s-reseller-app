interface PasswordResetRequest {
    email: string;
    /** @deprecated Ignored — the reset code is generated server-side. */
    resetCode?: string;
    userAgent?: string;
    timestamp?: string;
    userType?: 'B2B' | 'B2C' | 'AFFILIATE';
    language?: string;
}
export declare const sendPasswordResetEmail: import("firebase-functions/v2/https").CallableFunction<PasswordResetRequest, any, unknown>;
export {};
