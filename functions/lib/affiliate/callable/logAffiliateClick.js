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
        console.log(`Click logged for affiliate ${affiliateCode}, clickId: ${clickRef.id}`);
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