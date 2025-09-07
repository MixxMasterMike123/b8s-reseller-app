export declare const testPasswordResetMinimal: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
    messageId: string;
    resetCode: string;
    smtpConfig: {
        host: string;
        port: string;
        user: string;
    };
}>, unknown>;
