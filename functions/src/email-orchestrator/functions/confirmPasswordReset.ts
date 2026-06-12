// confirmPasswordReset - Unified Password Reset Confirmation Function
// Replaces: confirmPasswordResetV2, confirmPasswordResetV3

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { appUrls } from '../../config/app-urls';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../../config/database';

interface PasswordResetConfirmRequest {
  resetCode: string;
  newPassword: string;
}

export const confirmPasswordReset = onCall<PasswordResetConfirmRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: appUrls.CORS_ORIGINS
  },
  async (request) => {
    const { resetCode, newPassword } = request.data;

    if (!resetCode || !newPassword) {
      throw new HttpsError('invalid-argument', 'Reset code and new password are required');
    }

    if (newPassword.length < 6) {
      throw new HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }

    try {
      console.log(`🔍 Processing password reset confirmation for code: ${resetCode}`);

      // Find and validate the reset code
      const resetQuery = await db.collection('passwordResets')
        .where('resetCode', '==', resetCode)
        .where('used', '==', false)
        .get();

      if (resetQuery.empty) {
        throw new HttpsError('invalid-argument', 'Invalid or already used reset code');
      }

      const resetDoc = resetQuery.docs[0];
      const resetData = resetDoc.data();

      // Check if code has expired (1 hour)
      const now = new Date();
      const expiresAt = resetData.expiresAt.toDate();

      if (now > expiresAt) {
        throw new HttpsError('invalid-argument', 'Reset code has expired');
      }

      // Find the user by email
      const auth = getAuth();
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(resetData.email);
      } catch (error) {
        throw new HttpsError('not-found', 'User not found');
      }

      // Update the user's password using Firebase Admin
      await auth.updateUser(userRecord.uid, {
        password: newPassword
      });

      // Mark the reset code as used
      await resetDoc.ref.update({
        used: true,
        usedAt: new Date()
      });

      console.log(`✅ Password successfully reset for user: ${resetData.email}`);

      return {
        success: true,
        email: resetData.email
      };
    } catch (error) {
      console.error('❌ Error confirming password reset:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to reset password');
    }
  }
);
