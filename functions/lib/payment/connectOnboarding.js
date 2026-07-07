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
exports.statusPatch = exports.deriveStatus = exports.setConnectPayoutDelay = exports.getConnectBalance = exports.setShopCommission = exports.createConnectLoginLink = exports.refreshConnectStatus = exports.createConnectAccountLink = exports.createConnectAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const authGuard_1 = require("../email-orchestrator/functions/authGuard");
const connectParams_1 = require("./connectParams");
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
// Surface Stripe failures as HttpsError so the admin UI shows the real reason
// instead of a bare "INTERNAL" (e.g. the live platform-profile-incomplete
// error). Auth/shop HttpsErrors pass through untouched.
function toHttpsError(e) {
    if (e instanceof https_1.HttpsError)
        return e;
    const msg = e?.raw?.message || e?.message || 'Okänt fel mot Stripe';
    return new https_1.HttpsError('failed-precondition', `Stripe: ${msg}`);
}
async function stripeCall(fn) {
    try {
        return await fn();
    }
    catch (e) {
        throw toHttpsError(e);
    }
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
function accountLinkUrls(shopId) {
    const base = app_urls_1.appUrls.ADMIN_BASE.replace(/\/$/, '');
    // shopId MUST ride along: a platform operator's managed-shop context does not
    // survive the round-trip through Stripe's hosted onboarding (it falls back to
    // the default shop), and the return-side status refresh writes to whatever
    // shop the page resolves. The deep-link param re-pins it.
    const shop = encodeURIComponent(shopId);
    return {
        refresh_url: `${base}/admin/payments?refresh=1&shopId=${shop}`,
        return_url: `${base}/admin/payments?return=1&shopId=${shop}`,
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
        const account = await stripeCall(() => stripe.accounts.create({
            type: 'express',
            country: 'SE',
            default_currency: 'sek',
            email: ownerEmail,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            // Platform standard: MONTHLY payouts on the 1st. Keeps per-payout fees
            // trivial (≤12 events/yr/shop), gives the shop one clean bookkeeping
            // entry per month, and is predictable ("pengarna den 1:a varje månad").
            // Per-shop overrides stay a platform lever (Stripe dashboard /
            // setConnectPayoutDelay for the risk-delay). Existing accounts are NOT
            // migrated — this applies at creation only.
            settings: {
                payouts: { schedule: { interval: 'monthly', monthly_anchor: 1 } },
            },
            metadata: { shopId },
        }));
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
    const link = await stripeCall(() => stripe.accountLinks.create({
        account: accountId,
        ...accountLinkUrls(shopId),
        type: 'account_onboarding',
    }));
    return { url: link.url, accountId };
});
// ── createConnectAccountLink ────────────────────────────────────────────────
// Resume/refresh an onboarding link (the prior link expired, or the shop hit
// the refresh_url). No account creation.
exports.createConnectAccountLink = (0, https_1.onCall)(COMMON, async (request) => {
    const { shopId, data } = await loadShopForAdmin(request.data?.shopId, request.auth?.uid);
    const accountId = (data.payments || {}).stripeAccountId;
    if (!accountId) {
        throw new https_1.HttpsError('failed-precondition', 'No connected account yet — start onboarding first');
    }
    const stripe = getStripe();
    const link = await stripeCall(() => stripe.accountLinks.create({
        account: accountId,
        ...accountLinkUrls(shopId),
        type: 'account_onboarding',
    }));
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
    const acct = await stripeCall(() => stripe.accounts.retrieve(pay.stripeAccountId));
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
    const link = await stripeCall(() => stripe.accounts.createLoginLink(pay.stripeAccountId));
    return { url: link.url };
});
exports.setShopCommission = (0, https_1.onCall)({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 30, cors: app_urls_1.appUrls.CORS_ORIGINS }, async (request) => {
    await (0, authGuard_1.requirePlatform)(request.auth?.uid);
    const shopId = (request.data?.shopId || '').trim();
    const bps = request.data?.commissionBps;
    if (!shopId)
        throw new https_1.HttpsError('invalid-argument', 'shopId is required');
    if (!Number.isInteger(bps) || bps < 0 || bps > 10000) {
        throw new https_1.HttpsError('invalid-argument', 'commissionBps must be an integer 0..10000');
    }
    const snap = await database_1.db.collection('shops').doc(shopId).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', `Shop "${shopId}" does not exist`);
    await database_1.db.collection('shops').doc(shopId).update({ 'payments.commissionBps': bps });
    return { shopId, commissionBps: bps };
});
// ── getConnectBalance ───────────────────────────────────────────────────────
// Read the connected account's Stripe balance (available/pending/reserved) +
// the negative-balance flag = the payout-risk signal. A shop admin may read
// THEIR OWN shop's balance; platform may read any (requireAdminOfShop). The
// summary math is the pure, unit-tested summarizeConnectBalance.
exports.getConnectBalance = (0, https_1.onCall)(COMMON, async (request) => {
    const { data } = await loadShopForAdmin(request.data?.shopId, request.auth?.uid);
    const pay = data.payments || {};
    if (!pay.stripeAccountId) {
        return { hasAccount: false };
    }
    const stripe = getStripe();
    // Balance OF THE CONNECTED ACCOUNT — addressed via the stripeAccount option.
    const balance = await stripeCall(() => stripe.balance.retrieve({ stripeAccount: pay.stripeAccountId }));
    // Report in the shop's currency. All Express accounts are created
    // country:'SE' default_currency:'sek', so this matches the account's balance
    // currency today; if multi-currency accounts arrive, summarize per currency.
    const currency = (data.storeIdentity?.currency || 'sek').toLowerCase();
    const summary = (0, connectParams_1.summarizeConnectBalance)(balance, currency);
    // Surface the stored delay as-is: an integer, the string 'minimum', or null
    // when never set — so the admin UI can round-trip the 'minimum' state.
    const payoutDelayDays = Number.isInteger(pay.payoutDelayDays) || pay.payoutDelayDays === 'minimum'
        ? pay.payoutDelayDays
        : null;
    return {
        hasAccount: true,
        payoutDelayDays,
        ...summary,
    };
});
exports.setConnectPayoutDelay = (0, https_1.onCall)(COMMON, async (request) => {
    await (0, authGuard_1.requirePlatform)(request.auth?.uid);
    const shopId = (request.data?.shopId || '').trim();
    const delayDays = request.data?.delayDays;
    if (!shopId)
        throw new https_1.HttpsError('invalid-argument', 'shopId is required');
    const isMinimum = delayDays === 'minimum';
    const isValidNumber = Number.isInteger(delayDays) && delayDays >= 0 && delayDays <= 365;
    if (!isMinimum && !isValidNumber) {
        throw new https_1.HttpsError('invalid-argument', "delayDays must be an integer 0..365 or 'minimum'");
    }
    const snap = await database_1.db.collection('shops').doc(shopId).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', `Shop "${shopId}" does not exist`);
    const pay = snap.data()?.payments || {};
    if (!pay.stripeAccountId) {
        throw new https_1.HttpsError('failed-precondition', 'No connected account to configure yet');
    }
    const stripe = getStripe();
    // Set the per-account payout schedule delay. interval stays the account
    // default (daily); we only adjust the hold window.
    await stripeCall(() => stripe.accounts.update(pay.stripeAccountId, {
        settings: { payouts: { schedule: { delay_days: delayDays } } },
    }));
    // Persist for display (the source of truth is Stripe; this mirrors it).
    await database_1.db.collection('shops').doc(shopId).update({
        'payments.payoutDelayDays': isMinimum ? 'minimum' : delayDays,
        'payments.payoutDelayUpdatedAt': firestore_1.FieldValue.serverTimestamp(),
    });
    return { shopId, delayDays };
});
//# sourceMappingURL=connectOnboarding.js.map