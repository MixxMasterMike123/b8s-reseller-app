/**
 * Stripe Connect — pure parameter builders (no I/O, no Stripe SDK).
 *
 * Extracted from createPaymentIntent.ts (destination-charge branch) and
 * connectRefund.ts (refund branch) so the money-path DECISION LOGIC is unit-
 * testable without hitting Stripe or Firestore. The handlers call these; the
 * tests assert the exact param shapes (the bugs that would actually hurt:
 * forgetting transfer_data, a wrong fee, or a Connect refund missing the
 * transfer reversal). Fee arithmetic lives in connectFee.ts.
 */

import { computeApplicationFeeOre, resolveCommissionBps } from './connectFee';

export interface ConnectChargeBuild {
  // Spread into stripe.paymentIntents.create({ ... }). Empty for legacy shops.
  params: Record<string, any>;
  // Spread into the PaymentIntent metadata. Empty for legacy shops.
  meta: Record<string, string>;
  useConnect: boolean;
}

/**
 * Decide the destination-charge params for a checkout. A shop is "Connect-
 * enabled" ONLY when it has a usable connected account (chargesEnabled +
 * stripeAccountId); otherwise the result is empty and the PaymentIntent is the
 * legacy single-account charge. NO on_behalf_of → platform stays VAT MoR.
 *
 * @param pay              shops/{id}.payments map (may be undefined)
 * @param amountOre        gross charge amount in öre
 * @param platformDefaultBps  fallback commission (settings/platform → env)
 */
export function buildConnectChargeParams(
  pay: any,
  amountOre: number,
  platformDefaultBps: number
): ConnectChargeBuild {
  const useConnect = pay?.chargesEnabled === true && !!pay?.stripeAccountId;
  if (!useConnect) return { params: {}, meta: {}, useConnect: false };

  const bps = resolveCommissionBps(pay.commissionBps, platformDefaultBps);
  const feeOre = computeApplicationFeeOre(amountOre, bps);
  return {
    useConnect: true,
    params: {
      transfer_data: { destination: pay.stripeAccountId },
      application_fee_amount: feeOre,
    },
    meta: {
      connectedAccountId: pay.stripeAccountId,
      applicationFeeAmount: String(feeOre),
      commissionBps: String(bps),
    },
  };
}

/**
 * Decide the refund params for an order. A destination-charge order must claw
 * the principal back from the connected account (reverse_transfer); whether it
 * ALSO returns the platform fee to the buyer is a platform policy
 * (refundApplicationFee). A legacy order takes a plain refund.
 *
 * @param order               the order doc
 * @param amountSek           optional partial refund amount in SEK
 * @param refundApplicationFee  platform policy: also return the platform fee?
 *                            Default true (current behaviour). false keeps the
 *                            fee as a non-refundable service fee.
 */
export function buildRefundParams(
  order: any,
  amountSek?: number,
  refundApplicationFee: boolean = true
): Record<string, any> {
  const paymentIntentId = order?.payment?.paymentIntentId;
  const params: Record<string, any> = { payment_intent: paymentIntentId };
  if (typeof amountSek === 'number' && amountSek > 0) {
    params.amount = Math.round(amountSek * 100);
  }
  if (order?.connect?.isDestinationCharge === true) {
    // Always claw the principal back from the shop on a Connect refund —
    // otherwise the platform eats the refund while the shop keeps the transfer.
    params.reverse_transfer = true;
    // The platform fee is returned only when policy says so. We set the key
    // explicitly (true OR false) so the intent is unambiguous to Stripe and in
    // the persisted reconciliation — never silently omitted.
    params.refund_application_fee = refundApplicationFee === true;
  }
  return params;
}
