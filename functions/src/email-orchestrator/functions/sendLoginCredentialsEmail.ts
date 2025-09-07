// sendLoginCredentialsEmail - Unified Login Credentials Function
// Replaces: sendWelcomeCredentialsV3, sendAffiliateCredentialsV3, "Skicka inloggningsuppgifter" buttons

import { onCall } from 'firebase-functions/v2/https';
import { EmailOrchestrator } from '../core/EmailOrchestrator';

interface LoginCredentialsRequest {
  userInfo: {
    name: string;
    email: string;
    companyName?: string;
    contactPerson?: string;
  };
  credentials: {
    email: string;
    temporaryPassword?: string;
    affiliateCode?: string;
  };
  accountType: 'B2B' | 'AFFILIATE';
  wasExistingAuthUser?: boolean;
  userId?: string;
  language?: string;
}

export const sendLoginCredentialsEmail = onCall<LoginCredentialsRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('📧 sendLoginCredentialsEmail: Starting unified credentials email');
      console.log('📧 Request data:', {
        userEmail: request.data.userInfo.email,
        accountType: request.data.accountType,
        wasExistingAuthUser: request.data.wasExistingAuthUser,
        hasTemporaryPassword: !!request.data.credentials.temporaryPassword,
        hasAffiliateCode: !!request.data.credentials.affiliateCode
      });

      // Validate required data
      if (!request.data.userInfo?.email) {
        throw new Error('User email is required');
      }
      
      if (!request.data.userInfo?.name) {
        throw new Error('User name is required');
      }

      if (!request.data.credentials?.email) {
        throw new Error('Credentials email is required');
      }

      if (!request.data.accountType) {
        throw new Error('Account type is required');
      }

      // Initialize EmailOrchestrator
      const orchestrator = new EmailOrchestrator();

      // Send login credentials email via orchestrator
      const result = await orchestrator.sendEmail({
        emailType: 'LOGIN_CREDENTIALS',
        userId: request.data.userId,
        customerInfo: {
          email: request.data.userInfo.email,
          name: request.data.userInfo.name
        },
        language: request.data.language || 'sv-SE',
        additionalData: {
          credentials: request.data.credentials,
          wasExistingAuthUser: request.data.wasExistingAuthUser || false,
          userInfo: request.data.userInfo,
          accountType: request.data.accountType
        },
        adminEmail: false
      });

      if (result.success) {
        console.log('✅ sendLoginCredentialsEmail: Success');
        return {
          success: true,
          messageId: result.messageId,
          details: result.details
        };
      } else {
        console.error('❌ sendLoginCredentialsEmail: Failed:', result.error);
        throw new Error(result.error || 'Login credentials email sending failed');
      }

    } catch (error) {
      console.error('❌ sendLoginCredentialsEmail: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in login credentials email');
    }
  }
);
