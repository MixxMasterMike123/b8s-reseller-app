"use strict";
// Content Studio callable 3 — getHandoffPackage.
//
// The "Skicka till mobilen" QR flow: the desktop stamps a random one-time
// token + 24h expiry onto a socialPosts draft, and the QR encodes only
// /handoff/{postId}#{token}. The phone is NOT logged in, so per the
// platform's access rule (UI scope ≠ access control; external parties get
// CALLABLE PROJECTIONS, not rule grants) this endpoint is the phone's only
// window into the data: it validates the token and returns a minimal
// projection — the generated copy and the rendered video URL. Nothing else
// on the doc (shopId, createdBy, assets, schedule) ever leaves the server.
//
// No auth required BY DESIGN — possession of the unguessable token (128-bit
// UUID, expiring, revoked by generating a new one) is the credential.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHandoffPackage = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const COMMON = {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
};
exports.getHandoffPackage = (0, https_1.onCall)(COMMON, async (request) => {
    const postId = String(request.data?.postId || '').trim();
    const token = String(request.data?.token || '').trim();
    if (!postId || !token || token.length < 20) {
        throw new https_1.HttpsError('invalid-argument', 'Ogiltig länk.');
    }
    const snap = await database_1.db.collection('socialPosts').doc(postId).get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Inlägget finns inte längre.');
    }
    const d = snap.data() || {};
    if (!d.handoffToken || String(d.handoffToken) !== token) {
        throw new https_1.HttpsError('permission-denied', 'Länken är ogiltig.');
    }
    const exp = d.handoffExpiresAt?.toDate?.();
    if (!exp || exp.getTime() < Date.now()) {
        throw new https_1.HttpsError('deadline-exceeded', 'Länken har gått ut. Skapa en ny QR-kod från datorn.');
    }
    // The add-on is opt-in per shop — a disabled shop's links stop working.
    const shopSnap = await database_1.db.collection('shops').doc(String(d.shopId || '')).get();
    const shopData = shopSnap.exists ? shopSnap.data() || {} : {};
    if (shopData.features?.contentStudio !== true) {
        throw new https_1.HttpsError('permission-denied', 'Länken är inte längre aktiv.');
    }
    // PROJECTION — only what the phone needs to post.
    return {
        copy: d.copy || null,
        video: d.video?.url
            ? { url: d.video.url, durationSec: d.video.durationSec || null }
            : null,
    };
});
//# sourceMappingURL=getHandoffPackage.js.map