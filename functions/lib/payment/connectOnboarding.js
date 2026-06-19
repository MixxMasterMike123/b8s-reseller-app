"use strict";
// Stripe Connect — onboarding callables (Slice 1).
//
// Lets a shop get a Stripe EXPRESS connected account so the platform can route
// destination charges to it (the per-shop payout target). Stripe hosts the
// onboarding + KYC; the platform only creates the account, hands out the
// hosted-onboarding link, and mirrors the account's status onto
// shops/{shopId}.payments.
//
// Money model: DESTINATION CHARGES (the charge stays on the platform account,
// Stripe transfers gross-minus-application_fee to this connected account).
// Platform stays VAT merchant of record (no on_behalf_of). See the approved
// plan + functions/src/payment/connectFee.ts.
//
// Auth: requireAdminOfShop(shopId, uid) — a shop admin may only onboard THEIR
// OWN shop; a platform operator may onboard any. (Commission rate + the
// connectEnabled opt-in are platform-only and live in separate callables.)
//
// Stripe env: the SAME platform STRIPE_SECRET_KEY is used for all Connect calls
// (connected accounts are addressed by their acct_ id, not a separate key).
// Build/test in TEST mode; live cutover is a later, deliberate step.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusPatch = exports.deriveStatus = exports.createConnectLoginLink = exports.refreshConnectStatus = exports.createConnectAccountLink = exports.createConnectAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const authGuard_1 = require("../email-orchestrator/functions/authGuard");
const COMMON = {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
    secrets: ['STRIPE_SECRET_KEY'],
};
function getStripe() {
    const key = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!key)
        throw new https_1.HttpsError('failed-precondition', 'Stripe is not configured');
    return new stripe_1.default(key, { apiVersion: '2023-10-16' });
}
// Map a Stripe Account to our connectStatus enum.
function deriveStatus(acct) {
    if (acct.charges_enabled)
        return 'active';
    if (acct.requirements?.disabled_reason)
        return 'restricted';
    if (acct.details_submitted)
        return 'pending';
    return 'onboarding';
}
exports.deriveStatus = deriveStatus;
// The shops/{id}.payments patch built from a freshly-retrieved account. Shared
// by refreshConnectStatus and (later) the account.updated webhook branch.
function statusPatch(acct, existing) {
    const chargesEnabled = acct.charges_enabled === true;
    const patch = {
        'payments.chargesEnabled': chargesEnabled,
        'payments.payoutsEnabled': acct.payouts_enabled === true,
        'payments.detailsSubmitted': acct.details_submitted === true,
        'payments.requirementsDue': acct.requirements?.currently_due ?? [],
        'payments.connectStatus': deriveStatus(acct),
        'payments.lastSyncedAt': firestore_1.FieldValue.serverTimestamp(),
    };
    if (chargesEnabled && !existing?.onboardingCompletedAt) {
        patch['payments.onboardingCompletedAt'] = firestore_1.FieldValue.serverTimestamp();
    }
    return patch;
}
exports.statusPatch = statusPatch;
async function loadShopForAdmin(shopId, uid) {
    const trimmed = (shopId || '').trim();
    if (!trimmed)
        throw new https_1.HttpsError('invalid-argument', 'shopId is required');
    // Authority check (Admin SDK bypasses Firestore rules — enforce in code).
    const ctx = await (0, authGuard_1.requireAdminOfShop)(trimmed, uid);
    const snap = await database_1.db.collection('shops').doc(trimmed).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', `Shop "${trimmed}" does not exist`);
    return { shopId: trimmed, ctx, snap, data: snap.data() || {} };
}
function accountLinkUrls() {
    const base = app_urls_1.appUrls.ADMIN_BASE.replace(/\/$/, '');
    return {
        refresh_url: `${base}/admin/payments?refresh=1`,
        return_url: `${base}/admin/payments?return=1`,
    };
}
exports.createConnectAccount = (0, https_1.onCall)(COMMON, async (request) => {
    const { shopId, ctx, data } = await loadShopForAdmin(request.data?.shopId, request.auth?.uid);
    const pay = data.payments || {};
    // The operator must have opted this shop in (platform bypasses the gate).
    if (pay.connectEnabled !== true && !ctx.platform) {
        throw new https_1.HttpsError('failed-precondition', 'Payments are not enabled for this shop yet');
    }
    const stripe = getStripe();
    let accountId = pay.stripeAccountId || '';
    if (!accountId) {
        const ownerEmail = data.ownerEmail || data.storeIdentity?.contactEmail || undefined;
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'SE',
            default_currency: 'sek',
            email: ownerEmail,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            metadata: { shopId },
        });
        accountId = account.id;
        await database_1.db.collection('shops').doc(shopId).set({
            payments: {
                stripeAccountId: accountId,
                connectStatus: 'onboarding',
                chargesEnabled: false,
                payoutsEnabled: false,
                onboardingStartedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        }, { merge: true });
    }
    const link = await stripe.accountLinks.create({
        account: accountId,
        ...accountLinkUrls(),
        type: 'account_onboarding',
    });
    return { url: link.url, accountId };
});
// ── createConnectAccountLink ────────────────────────────────────────────────
// Resume/refresh an onboarding link (the prior link expired, or the shop hit
// the refresh_url). No account creation.
exports.createConnectAccountLink = (0, https_1.onCall)(COMMON, async (request) => {
    const { data } = await loadShopForAdmin(request.data?.shopId, request.auth?.uid);
    const accountId = (data.payments || {}).stripeAccountId;
    if (!accountId) {
        throw new https_1.HttpsError('failed-precondition', 'No connected account yet — start onboarding first');
    }
    const stripe = getStripe();
    const link = await stripe.accountLinks.create({
        account: accountId,
        ...accountLinkUrls(),
        type: 'account_onboarding',
    });
    return { url: link.url };
});
// ── refreshConnectStatus ────────────────────────────────────────────────────
// Re-poll Stripe and persist status. THE source of truth — returning to
// return_url does NOT mean onboarding finished, so the admin page calls this on
// return and the operator can call it manually.
exports.refreshConnectStatus = (0, https_1.onCall)(COMMON, async (request) => {
    const { shopId, data } = await loadShopForAdmin(request.data?.shopId, request.auth?.uid);
    const pay = data.payments || {};
    if (!pay.stripeAccountId) {
        return { connectStatus: 'none', chargesEnabled: false };
    }
    const stripe = getStripe();
    const acct = await stripe.accounts.retrieve(pay.stripeAccountId);
    const patch = statusPatch(acct, pay);
    // Dotted field-paths update the nested payments.* keys in place (the
    // payments map already exists because createConnectAccount seeded it).
    await database_1.db.collection('shops').doc(shopId).update(patch);
    return {
        connectStatus: patch['payments.connectStatus'],
        chargesEnabled: patch['payments.chargesEnabled'],
        payoutsEnabled: patch['payments.payoutsEnabled'],
        requirementsDue: patch['payments.requirementsDue'],
    };
});
// ── createConnectLoginLink ──────────────────────────────────────────────────
// One-time link into the Stripe-hosted Express dashboard (balance/payouts).
// Only meaningful once charges are enabled.
exports.createConnectLoginLink = (0, https_1.onCall)(COMMON, async (request) => {
    const { data } = await loadShopForAdmin(request.data?.shopId, request.auth?.uid);
    const pay = data.payments || {};
    if (!pay.stripeAccountId || pay.chargesEnabled !== true) {
        throw new https_1.HttpsError('failed-precondition', 'The connected account is not active yet');
    }
    const stripe = getStripe();
    const link = await stripe.accounts.createLoginLink(pay.stripeAccountId);
    return { url: link.url };
});
//# sourceMappingURL=connectOnboarding.js.map