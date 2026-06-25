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
export interface ConnectChargeBuild {
    params: Record<string, any>;
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
export declare function buildConnectChargeParams(pay: any, amountOre: number, platformDefaultBps: number): ConnectChargeBuild;
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
export declare function buildRefundParams(order: any, amountSek?: number, refundApplicationFee?: boolean): Record<string, any>;
