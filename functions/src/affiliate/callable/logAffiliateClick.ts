import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';
import { AffiliateClickData, AffiliateClickResponse } from '../types';

/**
 * Log affiliate link click (Callable version)
 * Called when a user clicks an affiliate link
 */
export const logAffiliateClickV2 = onCall<AffiliateClickData>(
  { 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
  },
  async (request): Promise<AffiliateClickResponse> => {
    // Get Firestore instance (initialized at runtime)
    const db = getFirestore(getApp(), 'b8s-reseller-db');
    
    const { data } = request;
    const { affiliateCode } = data;

    if (!affiliateCode) {
      throw new Error('The function must be called with an affiliateCode.');
    }

    try {
      // Get affiliate details
      const affiliatesRef = db.collection('affiliates');
      const q = affiliatesRef.where('affiliateCode', '==', affiliateCode).where('status', '==', 'active');
      const affiliateSnapshot = await q.get();

      if (affiliateSnapshot.empty) {
        throw new Error(`No active affiliate found for code: ${affiliateCode}`);
      }

      const affiliateDoc = affiliateSnapshot.docs[0];

      // Create click record
      const clickRef = await db.collection('affiliateClicks').add({
        affiliateCode: affiliateCode,
        affiliateId: affiliateDoc.id,
        timestamp: Timestamp.now(),
        ipAddress: request.rawRequest?.ip || 'unknown',
        userAgent: request.rawRequest?.headers?.['user-agent'] || 'unknown',
        landingPage: request.rawRequest?.headers?.referer || 'unknown',
        converted: false,
      });

      // Update affiliate stats
      await affiliateDoc.ref.update({
        'stats.clicks': FieldValue.increment(1)
      });
    
      console.log(`Click logged for affiliate ${affiliateCode}, clickId: ${clickRef.id}`);

      return { 
        success: true, 
        message: `Click logged for affiliate ${affiliateCode}`,
        clickId: clickRef.id
      };

    } catch (error) {
      console.error(`Error logging affiliate click for code ${affiliateCode}:`, error);
      throw new Error('Error logging affiliate click.');
    }
  }
); 