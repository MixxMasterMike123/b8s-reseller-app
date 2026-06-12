// sendAffiliateWelcomeEmail - New Affiliate Onboarding Function
// Replaces: sendAffiliateWelcomeEmailV3, approveAffiliateV3 email functionality
// Used for: New affiliate approval and welcome (different from login credentials)

import { onCall } from 'firebase-functions/v2/https';
import { appUrls } from '../../config/app-urls';
import { EmailOrchestrator } from '../core/EmailOrchestrator';
import { requireAdmin } from './authGuard';

interface AffiliateWelcomeRequest {
  affiliateInfo: {
    name: string;
    email: string;
    affiliateCode: string;
    commissionRate?: number;
    checkoutDiscount?: number;
    preferredLang?: string;
  };
  credentials: {
    email: string;
    temporaryPassword?: string;
  };
  wasExistingAuthUser?: boolean;
  language?: string;
}

export const sendAffiliateWelcomeEmail = onCall<AffiliateWelcomeRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: appUrls.CORS_ORIGINS
  },
  async (request) => {
    try {
      // SECURITY: privileged mailer - admin only
      await requireAdmin(request.auth?.uid);

      console.log('🎉 sendAffiliateWelcomeEmail: Starting affiliate welcome onboarding');
      console.log('🎉 Request data:', {
        affiliateName: request.data.affiliateInfo.name,
        affiliateEmail: request.data.affiliateInfo.email,
        affiliateCode: request.data.affiliateInfo.affiliateCode,
        wasExistingAuthUser: request.data.wasExistingAuthUser,
        language: request.data.language
      });

      // Validate required data
      if (!request.data.affiliateInfo?.name) {
        throw new Error('Affiliate name is required');
      }
      
      if (!request.data.affiliateInfo?.email) {
        throw new Error('Affiliate email is required');
      }

      if (!request.data.affiliateInfo?.affiliateCode) {
        throw new Error('Affiliate code is required');
      }

      if (!request.data.credentials?.email) {
        throw new Error('Credentials email is required');
      }

      // Initialize EmailOrchestrator
      const orchestrator = new EmailOrchestrator();

      // Prepare affiliate welcome data
      const language = request.data.language || request.data.affiliateInfo.preferredLang || 'sv-SE';
      const wasExistingAuthUser = request.data.wasExistingAuthUser || false;

      // Send email via orchestrator
      const result = await orchestrator.sendEmail({
        emailType: 'AFFILIATE_WELCOME',
        customerInfo: {
          email: request.data.affiliateInfo.email,
          name: request.data.affiliateInfo.name
        },
        language: language,
        additionalData: {
          affiliateInfo: {
            name: request.data.affiliateInfo.name,
            email: request.data.affiliateInfo.email,
            affiliateCode: request.data.affiliateInfo.affiliateCode,
            commissionRate: request.data.affiliateInfo.commissionRate,
            checkoutDiscount: request.data.affiliateInfo.checkoutDiscount
          },
          credentials: {
            email: request.data.credentials.email,
            temporaryPassword: request.data.credentials.temporaryPassword
          },
          wasExistingAuthUser: wasExistingAuthUser
        }
      });

      if (result.success) {
        console.log('✅ sendAffiliateWelcomeEmail: Success - Welcome email sent');
        return {
          success: true,
          messageId: result.messageId,
          details: result.details,
          affiliateCode: request.data.affiliateInfo.affiliateCode,
          email: request.data.affiliateInfo.email,
          wasExistingAuthUser: wasExistingAuthUser,
          language: language
        };
      } else {
        console.error('❌ sendAffiliateWelcomeEmail: Failed:', result.error);
        throw new Error(result.error || 'Affiliate welcome email sending failed');
      }

    } catch (error) {
      console.error('❌ sendAffiliateWelcomeEmail: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in affiliate welcome email');
    }
  }
);
