"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAffiliateClickHttpV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
/**
 * Log affiliate link click (HTTP version with CORS)
 * Called when a user clicks an affiliate link from external sites
 */
exports.logAffiliateClickHttpV2 = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true
}, async (req, res) => {
    // Get Firestore instance (initialized at runtime)
    const db = (0, firestore_1.getFirestore)((0, app_1.getApp)(), 'b8s-reseller-db');
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
    const { affiliateCode, campaignCode } = req.body;
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
            campaignCode: campaignCode || null,
            timestamp: firestore_1.Timestamp.now(),
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            landingPage: req.headers.referer || 'unknown',
            converted: false,
        });
        // Update affiliate stats
        await affiliateDoc.ref.update({
            'stats.clicks': firestore_1.FieldValue.increment(1)
        });
        // Update campaign stats if campaign code provided
        if (campaignCode) {
            try {
                const campaignsRef = db.collection('campaigns');
                const campaignQuery = campaignsRef.where('code', '==', campaignCode);
                const campaignSnapshot = await campaignQuery.get();
                if (!campaignSnapshot.empty) {
                    const campaignDoc = campaignSnapshot.docs[0];
                    await campaignDoc.ref.update({
                        'totalClicks': firestore_1.FieldValue.increment(1)
                    });
                    console.log(`Campaign click logged for campaign ${campaignCode}`);
                }
                else {
                    console.warn(`Campaign not found for code: ${campaignCode}`);
                }
            }
            catch (campaignError) {
                console.error(`Error updating campaign stats for ${campaignCode}:`, campaignError);
                // Don't throw error here - affiliate click was successful
            }
        }
        console.log(`HTTP click logged for affiliate ${affiliateCode}${campaignCode ? ` with campaign ${campaignCode}` : ''}, clickId: ${clickRef.id}`);
        res.status(200).json({
            success: true,
            message: `Click logged for affiliate ${affiliateCode}`,
            clickId: clickRef.id
        });
    }
    catch (error) {
        console.error(`Error logging affiliate click for code ${affiliateCode}:`, error);
        res.status(500).json({
            success: false,
            error: 'Error logging affiliate click.'
        });
    }
});
//# sourceMappingURL=logAffiliateClickHttp.js.map