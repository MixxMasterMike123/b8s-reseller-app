export { sendOrderConfirmationEmail } from './sendOrderConfirmationEmail';
export { sendOrderStatusUpdateEmail } from './sendOrderStatusUpdateEmail';
export declare const testEmailOrchestrator: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    error?: string | undefined;
    details?: any;
}>, unknown>;
