// ============================================================================
// EXTRACT for legal review — VERBATIM, full file (pure money-path decision logic,
// no Stripe SDK, no I/O, no secrets). This is THE source of truth for: which
// charge type, the fee, and the refund (transfer-reversal) behavior.
// from: functions/src/payment/connectParams.ts L1-76 (complete)
// ============================================================================

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
      transfer_data: { destination: pay.stripeAccountId },   // DESTINATION CHARGE
      application_fee_amount: feeOre,                          // platform cut (öre)
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
 * the principal back from the connected account AND return the platform fee;
 * a legacy order takes a plain refund.
 */
export function buildRefundParams(order: any, amountSek?: number): Record<string, any> {
  const paymentIntentId = order?.payment?.paymentIntentId;
  const params: Record<string, any> = { payment_intent: paymentIntentId };
  if (typeof amountSek === 'number' && amountSek > 0) {
    params.amount = Math.round(amountSek * 100);
  }
  if (order?.connect?.isDestinationCharge === true) {
    params.reverse_transfer = true;        // claw principal back from connected account
    params.refund_application_fee = true;  // return the platform fee
  }
  return params;
}
