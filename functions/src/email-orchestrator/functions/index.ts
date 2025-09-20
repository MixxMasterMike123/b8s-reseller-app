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
export { sendEmailVerification } from './sendEmailVerification';
export { sendCustomEmailVerification } from './sendCustomEmailVerification';
export { verifyEmailCode } from './verifyEmailCode';
export { confirmPasswordReset } from './confirmPasswordReset';
export { sendAffiliateApplicationEmails } from './sendAffiliateApplicationEmails';
export { sendB2BApplicationEmails } from './sendB2BApplicationEmails';

// TODO: Implement remaining functions

// Test function for EmailOrchestrator system
import { onCall } from 'firebase-functions/v2/https';
import { EmailOrchestrator } from '../core/EmailOrchestrator';

export const testEmailOrchestrator = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('🧪 testEmailOrchestrator: Running system test');
      
      const orchestrator = new EmailOrchestrator();
      const result = await orchestrator.testSystem();
      
      console.log('🧪 testEmailOrchestrator: Test completed');
      return result;
      
    } catch (error) {
      console.error('❌ testEmailOrchestrator: Test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }
);
