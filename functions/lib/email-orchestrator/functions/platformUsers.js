"use strict";
// platformUsers — operator-console user administration (Settings → Användare).
//
// Two PLATFORM-ONLY callables (requirePlatform). LISTING is done client-side
// (the page queries users where role=='admin' directly — firestore.rules lets
// isPlatform() read any user doc), so no list callable exists. Only the two
// operations that REQUIRE the Admin SDK are functions:
//   • createPlatformSuperAdmin — provisions a NEW platform super-admin
//                              (platform:true, shopId=null): Auth account +
//                              users/{uid} doc + custom claims + credentials
//                              email. Modeled on createShopUser.
//   • deletePlatformUser     — deletes an admin's Auth account + users/{uid}
//                              doc. Lockout guards: never delete yourself, never
//                              delete the LAST platform super-admin.
//
// Why callables (Admin SDK): only the Admin SDK can create/delete a Firebase
// Auth account and set custom claims — the client cannot. Claims are set inline
// because Storage rules read token.platform and can't read the named DB. (The
// syncUserClaimsOnWrite trigger also keeps them in sync, but we set them here so
// they're live immediately, matching createShopUser.)
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlatformUser = exports.createPlatformSuperAdmin = exports.mintImpersonationToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_urls_1 = require("../../config/app-urls");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("../../config/database");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
const authGuard_1 = require("./authGuard");
const auth = (0, auth_1.getAuth)();
const COMMON = {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
};
// ── mint impersonation handoff token ──────────────────────────────────────────
//
// The platform operator console (platform-meteorpr.web.app) and the shop-admin
// host (meteorpr.web.app) are SEPARATE ORIGINS with independent Firebase Auth
// sessions (per-origin IndexedDB). So "Öppna Shop Admin" opens a host where the
// operator has NO session — it only worked in a browser that had previously
// logged into the admin host directly. This callable lets the platform host mint
// a short-lived Firebase custom token FOR THE CALLER'S OWN uid; the admin host
// consumes it with signInWithCustomToken to silently re-materialize the SAME
// identity on that origin, in ANY browser. It is NOT a privilege grant — it
// returns the operator's own identity, gated by requirePlatform — and the
// existing impersonation audit-doc check remains the accountability gate.
exports.mintImpersonationToken = (0, https_1.onCall)(COMMON, async (request) => {
    // Verify the caller is a platform super-admin against the LIVE users doc
    // (not the token claim) — a demoted operator is refused immediately.
    await (0, authGuard_1.requirePlatform)(request.auth?.uid);
    // Mint a custom token for the caller's OWN uid only. We deliberately do NOT
    // accept a target uid from the client: impersonation is a data-SCOPE applied
    // on the admin host (via the audit doc + session), not an identity swap. So
    // the token just re-authenticates the operator as themselves elsewhere.
    const token = await auth.createCustomToken(request.auth.uid);
    return { token };
});
exports.createPlatformSuperAdmin = (0, https_1.onCall)({ ...COMMON, secrets: ['RESEND_API_KEY'] }, async (request) => {
    await (0, authGuard_1.requirePlatform)(request.auth?.uid);
    const email = (request.data.email || '').trim().toLowerCase();
    const name = (request.data.name || '').trim() || email;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new https_1.HttpsError('invalid-argument', 'A valid email is required');
    }
    // Create (or carefully reuse) the Auth account. Same deny-by-default reuse
    // guard as createShopUser: only reuse an account that is ALREADY a platform
    // super-admin (re-inviting / resending). Any other existing account — a shop
    // admin, a B2C customer, an affiliate — is refused, so we never silently
    // escalate an existing user to platform.
    const tempPassword = Math.random().toString(36).slice(2) + 'A1!';
    let authUser;
    let wasExistingAuthUser = false;
    try {
        authUser = await auth.createUser({
            email,
            password: tempPassword,
            displayName: name,
            emailVerified: true,
        });
    }
    catch (error) {
        if (error.code === 'auth/email-already-exists') {
            authUser = await auth.getUserByEmail(email);
            const existing = await database_1.db.collection('users').doc(authUser.uid).get();
            const ed = existing.exists ? existing.data() : null;
            const isAlreadySuperAdmin = ed && ed.role === 'admin' && ed.platform === true;
            if (!isAlreadySuperAdmin) {
                throw new https_1.HttpsError('already-exists', `${email} används redan av ett annat konto och kan inte göras till plattformsadmin. Använd en annan e-postadress.`);
            }
            await auth.updateUser(authUser.uid, { password: tempPassword });
            wasExistingAuthUser = true;
        }
        else {
            throw error;
        }
    }
    const uid = authUser.uid;
    // users/{uid} doc KEYED BY UID (so AuthContext + Firestore rules + claims all
    // line up). shopId = null: platform admins bypass shop-scoping, AuthContext
    // already treats a platform user as "no shopId", and firestore.rules documents
    // that "platform super-admin docs carry shopId == null" (rules ~L567). Using a
    // real shop id (e.g. 'b8shield') would let a future admin OF that shop read
    // this platform doc via the same-shop read branch — null closes that leak.
    await database_1.db.collection('users').doc(uid).set({
        email,
        contactPerson: name,
        role: 'admin',
        shopId: null,
        platform: true,
        active: true,
        isActive: true,
        createdByPlatform: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(wasExistingAuthUser ? {} : { createdAt: firestore_1.FieldValue.serverTimestamp() }),
    }, { merge: true });
    // Set claims inline (Storage rules read token.platform and can't read the DB).
    // Matches syncUserClaimsOnWrite's shape (shopId: userData.shopId || null).
    await auth.setCustomUserClaims(uid, {
        role: 'admin',
        shopId: null,
        platform: true,
    });
    // Credentials email — best-effort (a mail failure must not undo a
    // successfully provisioned admin; surface it in the response instead).
    let emailSent = false;
    let emailError = null;
    try {
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        const result = await orchestrator.sendEmail({
            emailType: 'LOGIN_CREDENTIALS',
            userId: uid,
            customerInfo: { email, name },
            language: 'sv-SE',
            additionalData: {
                credentials: { email, temporaryPassword: tempPassword },
                wasExistingAuthUser,
                userInfo: { name, email },
                accountType: 'B2B',
            },
            adminEmail: false,
        });
        emailSent = !!result.success;
        if (!result.success)
            emailError = result.error || 'Email sending failed';
    }
    catch (e) {
        emailError = e instanceof Error ? e.message : 'Email sending failed';
    }
    return { success: true, uid, email, wasExistingAuthUser, emailSent, emailError };
});
exports.deletePlatformUser = (0, https_1.onCall)(COMMON, async (request) => {
    const callerUid = request.auth?.uid;
    await (0, authGuard_1.requirePlatform)(callerUid);
    const uid = (request.data.uid || '').trim();
    if (!uid)
        throw new https_1.HttpsError('invalid-argument', 'uid is required');
    // Guard 1: never delete yourself (would lock the operator out mid-session).
    if (uid === callerUid) {
        throw new https_1.HttpsError('failed-precondition', 'Du kan inte ta bort ditt eget konto.');
    }
    const targetSnap = await database_1.db.collection('users').doc(uid).get();
    const target = targetSnap.exists ? targetSnap.data() : null;
    // Only manage admin accounts here (Settings → Användare is the admin console).
    if (!target || target.role !== 'admin') {
        throw new https_1.HttpsError('not-found', 'Ingen administratör med det ID:t hittades.');
    }
    // Guard 2: never delete the LAST usable platform super-admin (irreversible
    // lockout — no one could administer the platform afterwards).
    //
    // Two independent risks, closed together:
    //   (a) an orphan/disabled admin must NOT count as a survivor — a platform:true
    //       doc whose Auth account is missing or disabled is not login-capable;
    //   (b) two CONCURRENT deletes of DIFFERENT admins must not both pass (each
    //       seeing the other as the survivor) and race to zero.
    //
    // (a) is checked OUTSIDE the tx via Auth (can't read Auth state inside a tx).
    // (b) is closed INSIDE the tx: we re-read every OTHER platform-admin DOC and
    //     the target, require ≥1 other doc still {exists, platform:true}, then
    //     delete the target — all in one transaction. A concurrent delete of a
    //     shared candidate doc mutates a doc THIS tx read, so Firestore's
    //     serializable isolation forces one of the two to retry and re-observe the
    //     reduced set. (Single-field query for the id list — no composite index.)
    const isPlatformTarget = target.platform === true;
    let liveOtherUids = [];
    if (isPlatformTarget) {
        const platformAdmins = await database_1.db.collection('users').where('platform', '==', true).get();
        const otherUids = platformAdmins.docs.map((d) => d.id).filter((id) => id !== uid);
        // Keep only OTHERS whose Auth account exists AND is enabled (login-capable).
        for (const otherUid of otherUids) {
            try {
                const rec = await auth.getUser(otherUid);
                if (!rec.disabled)
                    liveOtherUids.push(otherUid);
            }
            catch (e) {
                if (e?.code === 'auth/user-not-found')
                    continue; // orphan doc — not usable
                throw e;
            }
        }
        if (liveOtherUids.length === 0) {
            throw new https_1.HttpsError('failed-precondition', 'Det måste finnas minst en fungerande plattformsadmin. Skapa en till innan du tar bort den sista.');
        }
    }
    // Delete the target's users doc inside a transaction. For a platform target we
    // re-read the live OTHERS inside the tx and require ≥1 still-platform survivor,
    // so concurrent different-admin deletes can't both commit (see (b) above). The
    // same-uid double-delete case no-ops (doc already gone).
    const deletedDoc = await database_1.db.runTransaction(async (tx) => {
        const ref = database_1.db.collection('users').doc(uid);
        // Firestore requires all reads before writes: read survivors first, then target.
        let survivorInTx = !isPlatformTarget;
        if (isPlatformTarget) {
            const otherSnaps = await tx.getAll(...liveOtherUids.map((id) => database_1.db.collection('users').doc(id)));
            survivorInTx = otherSnaps.some((s) => s.exists && s.data()?.platform === true);
        }
        const snap = await tx.get(ref);
        if (!snap.exists)
            return false; // already deleted by a concurrent call
        if (isPlatformTarget && !survivorInTx) {
            // A concurrent delete removed the last surviving platform admin between our
            // Auth check and this read. Abort rather than race to zero.
            throw new https_1.HttpsError('failed-precondition', 'Det måste finnas minst en fungerande plattformsadmin. Skapa en till innan du tar bort den sista.');
        }
        tx.delete(ref);
        return true;
    });
    // Delete the Auth account (idempotent — tolerate an already-missing account so
    // a half-provisioned user can still be cleaned up). Account deletion is what
    // invalidates the user's tokens/claims; the syncUserClaimsOnWrite trigger
    // no-ops on this delete because auth.getUser now throws user-not-found.
    try {
        await auth.deleteUser(uid);
    }
    catch (e) {
        if (e?.code !== 'auth/user-not-found')
            throw e;
    }
    return { success: true, uid, alreadyDeleted: !deletedDoc };
});
//# sourceMappingURL=platformUsers.js.map