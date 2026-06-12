"use strict";
// Shared auth guards for email callables. These functions can send branded
// email to arbitrary recipients, so every privileged one must verify the
// caller — otherwise the system is an open phishing mailer.
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("../../config/database");
async function requireAdmin(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const userDoc = await database_1.db.collection('users').doc(authUid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
}
exports.requireAdmin = requireAdmin;
function requireAuth(authUid) {
    if (!authUid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
}
exports.requireAuth = requireAuth;
//# sourceMappingURL=authGuard.js.map