export * from './email/functions';
export { sendOrderStatusEmail } from './email/functions';
export { sendB2COrderNotificationAdmin, sendB2COrderPendingEmail } from './email/functions';
export { sendOrderConfirmationEmails, sendUserActivationEmail, sendOrderStatusUpdateEmail, testEmail } from './email/functions';
export { updateCustomerEmail } from './email/functions';
export declare const exampleProtectedFunction: import("firebase-functions/v2/https").HttpsFunction;
