import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';
import { Request, Response } from 'express';

/**
 * Log affiliate link click (HTTP version with CORS)
 * Called when a user clicks an affiliate link from external sites
 */
export const logAffiliateClickHttpV2 = onRequest(
  { 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true
  },
  async (req: Request, res: Response) => {
    // Get Firestore instance (initialized at runtime)
    const db = getFirestore(getApp(), 'b8s-reseller-db');
    
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { affiliateCode } = req.body;

    if (!affiliateCode) {
      res.status(400).json({
        success: false,
        error: 'The request must include an affiliateCode.'
      });
      return;
    }

    try {
      // Get affiliate details
      const affiliatesRef = db.collection('affiliates');
      const q = affiliatesRef.where('affiliateCode', '==', affiliateCode).where('status', '==', 'active');
      const affiliateSnapshot = await q.get();

      if (affiliateSnapshot.empty) {
        res.status(404).json({
          success: false,
          error: `No active affiliate found for code: ${affiliateCode}`
        });
        return;
      }

      const affiliateDoc = affiliateSnapshot.docs[0];

      // Create click record
      const clickRef = await db.collection('affiliateClicks').add({
        affiliateCode: affiliateCode,
        affiliateId: affiliateDoc.id,
        timestamp: Timestamp.now(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        landingPage: req.headers.referer || 'unknown',
        converted: false,
      });

      // Update affiliate stats
      await affiliateDoc.ref.update({
        'stats.clicks': FieldValue.increment(1)
      });

      console.log(`HTTP click logged for affiliate ${affiliateCode}, clickId: ${clickRef.id}`);

      res.status(200).json({ 
        success: true, 
        message: `Click logged for affiliate ${affiliateCode}`,
        clickId: clickRef.id
      });

    } catch (error) {
      console.error(`Error logging affiliate click for code ${affiliateCode}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error logging affiliate click.'
      });
    }
  }
); 