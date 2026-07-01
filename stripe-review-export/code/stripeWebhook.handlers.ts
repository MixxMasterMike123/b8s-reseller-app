// ============================================================================
// EXTRACT for legal review — webhook signature verify, order creation, and the
// account.updated / charge.dispute.created handlers. Verbatim; secret is an env
// reference (no value). "…" marks omitted order-field assembly (see notes).
// ============================================================================

// from: functions/src/payment/stripeWebhook.ts L32 (function config)
//   secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],   // values = <REDACTED>

// from: functions/src/payment/stripeWebhook.ts L53-68 (SDK + secret sources)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;   // value = <REDACTED>
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();   // value = <REDACTED>
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

// from: functions/src/payment/stripeWebhook.ts L80-91 (signature verification)
let event: StripeWebhookEvent;
try {
  event = stripe.webhooks.constructEvent(
    request.rawBody || request.body,
    sig,
    webhookSecret
  ) as StripeWebhookEvent;
} catch (err: any) {
  response.status(400).json({ error: `Webhook Error: ${err.message}` });
  return;
}

// from: functions/src/payment/stripeWebhook.ts L100-123 (payment_intent.succeeded → order)
if (event.type === 'payment_intent.succeeded') {
  let paymentIntent = event.data.object;
  if (!paymentIntent.metadata?.source || paymentIntent.metadata.source !== 'b2c_shop') {
    response.status(200).json({ received: true, skipped: 'not_b2c' });
    return;
  }
  // Idempotency: order doc id == payment intent id (created atomically below).
  const orderRef = db.collection('orders').doc(paymentIntent.id);
  // Expand latest_charge so a Connect destination charge exposes its transfer +
  // application_fee ids for reconciliation (order.connect).
  paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
    expand: ['payment_method', 'latest_charge'],
  }) as any;

  const metadata = paymentIntent.metadata;
  const orderData = {
    orderNumber, status: 'confirmed', source: 'b2c',
    shopId: metadata.shopId || DEFAULT_SHOP_ID,
    // … customerInfo / shippingInfo / items / subtotal / vat / shipping / total
    //   all reconstructed from PaymentIntent metadata …
    payment: {
      method: 'stripe',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      // … card brand/last4 / wallet / klarna when present …
    },
    // 💸 Stripe Connect (DESTINATION CHARGE) recorded for reconciliation — ONLY
    // when this was a destination charge (legacy single-account orders omit it):
    ...(metadata.connectedAccountId && {
      connect: {
        isDestinationCharge: true,
        connectedAccountId: metadata.connectedAccountId,
        applicationFeeAmount: parseInt(metadata.applicationFeeAmount || '0', 10),
        applicationFeeId: ((paymentIntent.latest_charge as any)?.application_fee) || null,
        transferId: ((paymentIntent.latest_charge as any)?.transfer) || null,
        commissionBps: parseInt(metadata.commissionBps || '0', 10),
        transferReversed: false,
      },
    }),
    createdAt: new Date(), updatedAt: new Date(),
    webhookProcessed: true, webhookEventId: event.id,
  };

  // from: stripeWebhook.ts L295-308 (idempotent create)
  try {
    await orderRef.create(orderData);   // duplicate delivery → ALREADY_EXISTS → treated as success
  } catch (createError: any) {
    if (createError.code === 6 /* ALREADY_EXISTS */) {
      response.status(200).json({ received: true, existing: true });
      return;
    }
    throw createError;
  }
}

// from: functions/src/payment/stripeWebhook.ts L352-369 (account.updated → mirror Connect status)
else if (event.type === 'account.updated') {
  const acct = event.data.object as any;
  const shopId = acct?.metadata?.shopId;
  if (shopId) {
    const snap = await db.collection('shops').doc(shopId).get();
    const existing = (snap.data() as any)?.payments || {};
    await db.collection('shops').doc(shopId).update(statusPatch(acct, existing));
    // statusPatch → chargesEnabled, payoutsEnabled, detailsSubmitted, requirementsDue, connectStatus, lastSyncedAt, onboardingCompletedAt
  }
  response.status(200).json({ received: true, accountUpdated: true });
}

// from: functions/src/payment/stripeWebhook.ts L371-395 (dispute → RECORD ONLY)
else if (event.type === 'charge.dispute.created') {
  // 💸 A dispute opened. For destination charges with the platform as merchant
  // of record, Stripe debits the PLATFORM balance — so the platform carries
  // this exposure (reconcile with the shop out of band). We only STAMP the order.
  const dispute = event.data.object as any;
  const pi = dispute?.payment_intent;
  if (pi) {
    const ref = db.collection('orders').doc(typeof pi === 'string' ? pi : pi.id);
    const s = await ref.get();
    if (s.exists) {
      await ref.update({
        disputeStatus: dispute.status || 'open',
        disputedAt: new Date(),
        disputeId: dispute.id || null,
      });
    }
  }
  response.status(200).json({ received: true, disputeRecorded: true });
}

// NOTE for the reviewer (disputes/negatives):
//  - The dispute handler RECORDS ONLY; it does not move money or reverse the
//    connected-account transfer. With destination charges (platform = MoR),
//    Stripe debits the PLATFORM balance on a dispute/chargeback by default → the
//    platform bears the loss in code unless reconciled out of band (see comment
//    at L372-374). No negative-balance handling exists.
