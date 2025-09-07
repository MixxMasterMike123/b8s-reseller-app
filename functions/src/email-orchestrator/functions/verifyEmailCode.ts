// verifyEmailCode - Custom Email Verification Handler
// Handles verification of custom email verification codes
// Updates Firebase Auth user emailVerified status + B2C customer records

import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase services
const db = getFirestore('b8s-reseller-db');
const auth = getAuth();

interface VerifyEmailCodeRequest {
  verificationCode: string;
}

export const verifyEmailCode = onCall<VerifyEmailCodeRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('✅ verifyEmailCode: Starting email verification process');
      console.log('✅ Verification code:', request.data.verificationCode);

      // Validate required data
      if (!request.data.verificationCode) {
        throw new Error('Verification code is required');
      }

      // Get verification record
      console.log('🔍 Looking up verification record...');
      const verificationDoc = await db.collection('emailVerifications').doc(request.data.verificationCode).get();
      
      if (!verificationDoc.exists) {
        throw new Error('Invalid verification code');
      }

      const verificationData = verificationDoc.data();
      if (!verificationData) {
        throw new Error('Verification data not found');
      }

      // Check if already verified
      if (verificationData.verified) {
        console.log('ℹ️ Email already verified for:', verificationData.email);
        return {
          success: true,
          message: 'Email already verified',
          email: verificationData.email,
          alreadyVerified: true
        };
      }

      // Check expiration
      const now = new Date();
      const expiresAt = verificationData.expiresAt.toDate();
      if (now > expiresAt) {
        console.log('❌ Verification code expired for:', verificationData.email);
        throw new Error('Verification code has expired');
      }

      console.log('✅ Verification record valid, processing verification...');

      // Update Firebase Auth user to mark email as verified
      try {
        await auth.updateUser(verificationData.firebaseAuthUid, {
          emailVerified: true
        });
        console.log('✅ Firebase Auth user email verified:', verificationData.firebaseAuthUid);
      } catch (authError) {
        console.error('❌ Error updating Firebase Auth user:', authError);
        // Continue with process even if Auth update fails
      }

      // Update B2C customer record if exists
      try {
        console.log('🔍 Looking for B2C customer record...');
        const b2cQuery = await db.collection('b2cCustomers')
          .where('firebaseAuthUid', '==', verificationData.firebaseAuthUid)
          .limit(1)
          .get();

        if (!b2cQuery.empty) {
          const b2cCustomerDoc = b2cQuery.docs[0];
          await b2cCustomerDoc.ref.update({
            emailVerified: true,
            updatedAt: new Date()
          });
          console.log('✅ B2C customer record updated:', b2cCustomerDoc.id);
        } else {
          console.log('ℹ️ No B2C customer record found for:', verificationData.firebaseAuthUid);
        }
      } catch (b2cError) {
        console.error('❌ Error updating B2C customer:', b2cError);
        // Continue with process even if B2C update fails
      }

      // Mark verification as completed
      await verificationDoc.ref.update({
        verified: true,
        verifiedAt: new Date()
      });
      console.log('✅ Verification record marked as completed');

      console.log('🎉 Email verification completed successfully for:', verificationData.email);

      return {
        success: true,
        message: 'Email verified successfully',
        email: verificationData.email,
        customerInfo: verificationData.customerInfo,
        source: verificationData.source,
        verifiedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ verifyEmailCode: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in email verification');
    }
  }
);
