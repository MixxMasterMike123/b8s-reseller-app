// ============================================================================
// EXTRACT for legal review — VERBATIM (fee/commission math; pure, no secrets).
// from: functions/src/payment/connectFee.ts L20-43
// ============================================================================

/**
 * @returns the application_fee_amount in öre, clamped to [0, amountOre].
 * The platform fee is `bps` basis points of the GROSS charge amount (incl. VAT).
 */
export function computeApplicationFeeOre(amountOre: number, bps: number): number {
  if (!Number.isFinite(amountOre) || amountOre <= 0) return 0;
  const safeBps = Number.isFinite(bps) ? Math.max(0, Math.min(10000, Math.floor(bps))) : 0;
  const fee = Math.floor((amountOre * safeBps) / 10000);
  // Never exceed the charge (would make the transfer negative) and never < 0.
  return Math.max(0, Math.min(fee, amountOre));
}

/**
 * Resolve the effective per-shop commission (basis points):
 *   shop.payments.commissionBps  (if a valid integer)
 *   ?? platform default (settings/platform.defaultCommissionBps, passed in)
 *   ?? env PLATFORM_DEFAULT_COMMISSION_BPS (default 500 = 5.00%)
 */
export function resolveCommissionBps(
  shopCommissionBps: unknown,
  platformDefaultBps: number
): number {
  if (Number.isInteger(shopCommissionBps)) {
    return Math.max(0, Math.min(10000, shopCommissionBps as number));
  }
  return Math.max(0, Math.min(10000, Math.floor(platformDefaultBps) || 0));
}

// from: functions/src/config/app-urls.ts L70-76
//   defaultCommissionBps: parseInt(process.env.PLATFORM_DEFAULT_COMMISSION_BPS || '500', 10)
//   // 500 basis points = 5.00%  (basis points: integer 0..10000)
