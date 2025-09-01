export interface PasswordResetData {
    email: string;
    resetCode: string;
    userAgent?: string;
    timestamp?: string;
}
export declare function getPasswordResetTemplate(data: PasswordResetData, lang?: string): {
    subject: string;
    html: string;
};
