interface VerifyEmailCodeRequest {
    verificationCode: string;
}
export declare const verifyEmailCode: import("firebase-functions/v2/https").CallableFunction<VerifyEmailCodeRequest, any, unknown>;
export {};
