interface PasswordResetConfirmRequest {
    resetCode: string;
    newPassword: string;
}
export declare const confirmPasswordReset: import("firebase-functions/v2/https").CallableFunction<PasswordResetConfirmRequest, any, unknown>;
export {};
