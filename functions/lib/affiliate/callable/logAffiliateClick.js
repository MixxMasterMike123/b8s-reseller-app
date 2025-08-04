"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAffiliateClickV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
/**
 * Log affiliate link click (Callable version)
 * Called when a user clicks an affiliate link
 */
exports.logAffiliateClickV2 = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
}, async (request) => {
    // Get Firestore instance (initialized at runtime)
    const db = (0, firestore_1.getFirestore)((0, app_1.getApp)(), 'b8s-reseller-db');
    const { data } = request;
    const { affiliateCode, campaignCode } = data;
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
            campaignCode: campaignCode || null,
            timestamp: firestore_1.Timestamp.now(),
            ipAddress: request.rawRequest?.ip || 'unknown',
            userAgent: request.rawRequest?.headers?.['user-agent'] || 'unknown',
            landingPage: request.rawRequest?.headers?.referer || 'unknown',
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
        console.log(`Click logged for affiliate ${affiliateCode}${campaignCode ? ` with campaign ${campaignCode}` : ''}, clickId: ${clickRef.id}`);
        return {
            success: true,
            message: `Click logged for affiliate ${affiliateCode}`,
            clickId: clickRef.id
        };
    }
    catch (error) {
        console.error(`Error logging affiliate click for code ${affiliateCode}:`, error);
        throw new Error('Error logging affiliate click.');
    }
});
//# sourceMappingURL=logAffiliateClick.js.map