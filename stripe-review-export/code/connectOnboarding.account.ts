// ============================================================================
// EXTRACT for legal review — Connect account creation + onboarding (Express,
// Stripe-hosted Account Links). Verbatim; secret is an env reference (no value).
// ============================================================================

// from: functions/src/payment/connectOnboarding.ts L34-41 (SDK init)
//   secrets: ['STRIPE_SECRET_KEY'],   // value = <REDACTED>
function getStripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();   // value = <REDACTED>
  if (!key) throw new HttpsError('failed-precondition', 'Stripe is not configured');
  return new Stripe(key, { apiVersion: '2023-10-16' });
}

// from: functions/src/payment/connectOnboarding.ts L105-138
// createConnectAccount: create (or reuse) the shop owner's EXPRESS account and
// return a Stripe-hosted onboarding link. KYC is collected BY STRIPE.
if (!accountId) {
  const ownerEmail = data.ownerEmail || data.storeIdentity?.contactEmail || undefined;
  const account = await stripe.accounts.create({
    type: 'express',                       // ← EXPRESS connected account
    country: 'SE',
    default_currency: 'sek',
    email: ownerEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { shopId },                  // shopId on the account → webhook routing
  });
  accountId = account.id;
  await db.collection('shops').doc(shopId).set(
    {
      payments: {
        stripeAccountId: accountId,
        connectStatus: 'onboarding',
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingStartedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}
const link = await stripe.accountLinks.create({
  account: accountId,
  ...accountLinkUrls(),                     // refresh_url / return_url back to /admin/payments
  type: 'account_onboarding',              // Stripe-hosted onboarding (KYC, bank, ID)
});
return { url: link.url, accountId };

// from: functions/src/payment/connectOnboarding.ts L163-181 (status is re-polled from Stripe)
// refreshConnectStatus: returning to return_url does NOT mean onboarding finished;
// the admin page calls this to pull fresh status and persist it.
const acct = await stripe.accounts.retrieve(pay.stripeAccountId);
const patch = statusPatch(acct, pay);   // chargesEnabled, payoutsEnabled, detailsSubmitted,
                                        // requirementsDue, connectStatus, lastSyncedAt
await db.collection('shops').doc(shopId).update(patch);

// from: functions/src/payment/connectOnboarding.ts L186-195
// Express dashboard one-time login link.
const link2 = await stripe.accounts.createLoginLink(pay.stripeAccountId);

// NOTE for the reviewer:
//  - Only ONE connected-account type exists (express) and only for the SHOP OWNER.
//    There is NO print-shop account creation anywhere (consistent with the
//    two-party destination charge — no printer in the money flow).
//  - Stripe collects identity/bank/tax KYC during hosted onboarding; the platform
//    stores only the resulting status flags (see code/seller-data.md), not KYC data.
