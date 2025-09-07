export { sendOrderConfirmationEmail } from './sendOrderConfirmationEmail';
export { sendOrderStatusUpdateEmail } from './sendOrderStatusUpdateEmail';
export { sendOrderNotificationAdmin } from './sendOrderNotificationAdmin';
export { sendPasswordResetEmail } from './sendPasswordResetEmail';
export { sendLoginCredentialsEmail } from './sendLoginCredentialsEmail';
export { sendAffiliateWelcomeEmail } from './sendAffiliateWelcomeEmail';
export { approveAffiliate } from './approveAffiliate';
export { sendEmailVerification } from './sendEmailVerification';
export { sendCustomEmailVerification } from './sendCustomEmailVerification';
export { verifyEmailCode } from './verifyEmailCode';
export { confirmPasswordReset } from './confirmPasswordReset';
export { sendAffiliateApplicationEmails } from './sendAffiliateApplicationEmails';
export declare const testEmailOrchestrator: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    error?: string | undefined;
    details?: any;
}>, unknown>;
