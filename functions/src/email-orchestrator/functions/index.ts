// EmailOrchestrator Functions Index
// Unified email functions replacing ALL V1/V2/V3 email functions

// Import all unified email functions
export { sendOrderConfirmationEmail } from './sendOrderConfirmationEmail';
export { sendOrderStatusUpdateEmail } from './sendOrderStatusUpdateEmail';
export { sendOrderNotificationAdmin } from './sendOrderNotificationAdmin';
export { sendPasswordResetEmail } from './sendPasswordResetEmail';
export { sendLoginCredentialsEmail } from './sendLoginCredentialsEmail';
export { sendAffiliateWelcomeEmail } from './sendAffiliateWelcomeEmail';
export { approveAffiliate } from './approveAffiliate';
export { createShopUser } from './createShopUser';
export { createPlatformSuperAdmin, deletePlatformUser, mintImpersonationToken } from './platformUsers';
export { migrateFromShopify } from './migrateFromShopify';
export { migrateFromWoo } from './migrateFromWoo';
export { sendEmailVerification } from './sendEmailVerification';
export { sendCustomEmailVerification } from './sendCustomEmailVerification';
export { verifyEmailCode } from './verifyEmailCode';
export { confirmPasswordReset } from './confirmPasswordReset';
export { sendAffiliateApplicationEmails } from './sendAffiliateApplicationEmails';
// export { sendB2BApplicationEmails } from './sendB2BApplicationEmails'; // TEMPORARILY DISABLED
