// ============================================================================
// EXTRACT for legal review — the PaymentIntent (charge) creation + Connect
// destination-charge param resolution. Verbatim from the source; secrets are
// references to env vars (no values present). Trimmed to the Stripe-relevant
// parts; "…" marks omitted unrelated order-recovery metadata fields.
// ============================================================================

// from: functions/src/payment/createPaymentIntent.ts L205 (function config)
//   secrets: ['STRIPE_SECRET_KEY'],   // Firebase Functions secret (value = <REDACTED>)

// from: functions/src/payment/createPaymentIntent.ts L226-237 (SDK init)
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();   // value = <REDACTED>
if (!stripeSecretKey) {
  logger.error('❌ STRIPE_SECRET_KEY not found in environment');
  response.status(500).json({ error: 'Payment service configuration error' });
  return;
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// from: functions/src/payment/createPaymentIntent.ts L332-355
// 💸 STRIPE CONNECT (opt-in per shop). If this shop has a usable connected
// account, make this a DESTINATION CHARGE: the full amount transfers to the
// shop's account minus the platform's cut (application_fee_amount). A shop
// WITHOUT chargesEnabled stays on the legacy single-account flow — connectParams
// /connectMeta are then empty and the create call below is byte-identical to
// before. NO on_behalf_of → platform stays VAT merchant of record. The fee is
// taken off the GROSS total (documented choice).
const pay = (shopSnap.data() as any)?.payments || {};
let platformDefaultBps = commerceConfig.defaultCommissionBps;
if (pay.chargesEnabled === true && pay.stripeAccountId) {
  try {
    const ps = await db.collection('settings').doc('platform').get();
    const v = ps.exists ? (ps.data() as any)?.defaultCommissionBps : undefined;
    if (Number.isInteger(v)) platformDefaultBps = v;
  } catch { /* keep env default */ }
}
const connectBuild = buildConnectChargeParams(pay, amountInOre, platformDefaultBps);
const connectParams = connectBuild.params;   // { transfer_data, application_fee_amount } | {}
const connectMeta = connectBuild.meta;       // { connectedAccountId, applicationFeeAmount, commissionBps } | {}
if (connectBuild.useConnect) {
  logger.info('💸 Destination charge', { shopId: resolvedShopId, connectedAccountId: pay.stripeAccountId, fee: connectParams.application_fee_amount });
}

// from: functions/src/payment/createPaymentIntent.ts L358-462 (the charge)
let paymentIntent;
try {
  paymentIntent = await stripe.paymentIntents.create({
    amount: amountInOre,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: {
      // … order-recovery metadata (customer, shipping, totals, items, affiliate,
      //   b2cCustomerId, source:'b2c_shop', shopId, version:'enhanced_v2') …
      ...connectMeta   // L455: connectedAccountId/applicationFeeAmount/commissionBps (empty for legacy)
    },
    receipt_email: customerInfo.email,                                   // L457
    description: `${commerceConfig.shopName} Order - ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`, // L458

    // Stripe Connect destination-charge params (empty {} for legacy shops):
    ...connectParams   // L461:  { transfer_data:{destination}, application_fee_amount }
  });
} catch (e) {
  // … error handling …
}

// NOTE for the reviewer:
//  - NO `on_behalf_of` is ever set  → platform is settlement account / MoR.
//  - NO `{ stripeAccount }` request option (2nd arg) → this is NOT a direct charge.
//  - `...connectParams` is the ONLY thing that makes it a Connect (destination) charge.
//  - There is NO second transfer to any print-shop account anywhere (two-party only).
