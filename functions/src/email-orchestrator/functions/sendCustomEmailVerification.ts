// sendCustomEmailVerification - Complete B2C Email Verification System
// Replaces: Firebase's sendEmailVerification with custom verification flow
// Creates verification record + sends custom branded email

import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailOrchestrator } from '../core/EmailOrchestrator';

// Initialize Firestore with named database
const db = getFirestore('b8s-reseller-db');

interface CustomEmailVerificationRequest {
  customerInfo: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
    preferredLang?: string;
  };
  firebaseAuthUid: string;
  source?: string; // 'registration' | 'checkout'
  language?: string;
}

export const sendCustomEmailVerification = onCall<CustomEmailVerificationRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('🔐 sendCustomEmailVerification: Starting custom verification flow');
      console.log('🔐 Request data:', {
        customerEmail: request.data.customerInfo.email,
        customerName: request.data.customerInfo.firstName || request.data.customerInfo.name,
        firebaseAuthUid: request.data.firebaseAuthUid,
        source: request.data.source,
        language: request.data.language
      });

      // Validate required data
      if (!request.data.customerInfo?.email) {
        throw new Error('Customer email is required');
      }
      
      if (!request.data.firebaseAuthUid) {
        throw new Error('Firebase Auth UID is required');
      }

      // Generate secure verification code
      const verificationCode = Math.random().toString(36).substring(2, 15) + 
                              Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const language = request.data.language || request.data.customerInfo.preferredLang || 'sv-SE';

      // Store verification record in Firestore
      console.log('💾 Creating verification record...');
      const verificationData = {
        email: request.data.customerInfo.email,
        firebaseAuthUid: request.data.firebaseAuthUid,
        verificationCode: verificationCode,
        expiresAt: expiresAt,
        verified: false,
        createdAt: new Date(),
        source: request.data.source || 'registration',
        language: language,
        customerInfo: {
          firstName: request.data.customerInfo.firstName,
          lastName: request.data.customerInfo.lastName,
          name: request.data.customerInfo.name,
          email: request.data.customerInfo.email
        }
      };

      await db.collection('emailVerifications').doc(verificationCode).set(verificationData);
      console.log('✅ Verification record created with code:', verificationCode);

      // Send custom verification email via orchestrator
      console.log('📧 Sending custom verification email...');
      const orchestrator = new EmailOrchestrator();
      
      const emailResult = await orchestrator.sendEmail({
        emailType: 'EMAIL_VERIFICATION',
        customerInfo: {
          email: request.data.customerInfo.email,
          firstName: request.data.customerInfo.firstName,
          lastName: request.data.customerInfo.lastName,
          name: request.data.customerInfo.name
        },
        language: language,
        additionalData: {
          verificationCode: verificationCode,
          source: request.data.source || 'registration'
        }
      });

      if (emailResult.success) {
        console.log('✅ Custom verification email sent successfully');
        
        return {
          success: true,
          messageId: emailResult.messageId,
          verificationCode: verificationCode, // For testing/debugging only
          email: request.data.customerInfo.email,
          source: request.data.source,
          language: language,
          expiresAt: expiresAt.toISOString()
        };
      } else {
        console.error('❌ Custom verification email failed:', emailResult.error);
        
        // Clean up verification record if email failed
        await db.collection('emailVerifications').doc(verificationCode).delete();
        
        throw new Error(emailResult.error || 'Custom verification email sending failed');
      }

    } catch (error) {
      console.error('❌ sendCustomEmailVerification: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in custom email verification');
    }
  }
);
