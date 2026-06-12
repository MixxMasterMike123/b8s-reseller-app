// sendPasswordResetEmail - Unified Password Reset Function
// Replaces: sendPasswordResetV3, sendPasswordReset

import { onCall } from 'firebase-functions/v2/https';
import { appUrls } from '../../config/app-urls';
import { randomBytes } from 'crypto';
import { EmailOrchestrator } from '../core/EmailOrchestrator';
import { db } from '../../config/database';

interface PasswordResetRequest {
  email: string;
  /** @deprecated Ignored — the reset code is generated server-side. */
  resetCode?: string;
  userAgent?: string;
  timestamp?: string;
  userType?: 'B2B' | 'B2C' | 'AFFILIATE';
  language?: string;
}

export const sendPasswordResetEmail = onCall<PasswordResetRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: appUrls.CORS_ORIGINS
  },
  async (request) => {
    try {
      console.log('📧 sendPasswordResetEmail: Starting unified password reset');
      console.log('📧 Request data:', {
        email: request.data.email,
        userType: request.data.userType,
        language: request.data.language
      });

      // Validate required data
      if (!request.data.email) {
        throw new Error('Email is required');
      }

      // SECURITY: the reset code MUST be generated server-side. Accepting a
      // client-supplied code lets an attacker pre-choose the code for any
      // email address and take over the account.
      const resetCode = randomBytes(32).toString('hex');

      // Store reset code in Firestore (matching V3 behavior)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await db.collection('passwordResets').add({
        email: request.data.email,
        resetCode,
        expiresAt,
        used: false,
        createdAt: new Date(),
        userType: request.data.userType || 'B2C'
      });

      console.log('✅ Reset code stored in Firestore with 1 hour expiry');

      // Initialize EmailOrchestrator
      const orchestrator = new EmailOrchestrator();

      // Send password reset email via orchestrator
      const result = await orchestrator.sendEmail({
        emailType: 'PASSWORD_RESET',
        customerInfo: {
          email: request.data.email
        },
        language: request.data.language || 'sv-SE',
        additionalData: {
          resetCode,
          userAgent: request.data.userAgent,
          timestamp: request.data.timestamp,
          userType: request.data.userType || 'B2C'
        },
        adminEmail: false
      });

      if (result.success) {
        console.log('✅ sendPasswordResetEmail: Success');
        return {
          success: true,
          messageId: result.messageId,
          details: result.details
        };
      } else {
        console.error('❌ sendPasswordResetEmail: Failed:', result.error);
        throw new Error(result.error || 'Password reset email sending failed');
      }

    } catch (error) {
      console.error('❌ sendPasswordResetEmail: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in password reset email');
    }
  }
);
