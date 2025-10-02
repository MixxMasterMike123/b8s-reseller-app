export interface PasswordResetData {
    email: string;
    resetCode: string;
    userAgent?: string;
    timestamp?: string;
    userType: 'B2B' | 'B2C' | 'AFFILIATE';
}
export declare function generatePasswordResetTemplate(data: PasswordResetData, lang?: string): {
    subject: string;
    html: string;
};
