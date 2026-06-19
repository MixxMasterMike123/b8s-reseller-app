/**
 * Stripe Connect — platform fee computation.
 *
 * The platform's cut on a destination charge is taken via Stripe's
 * `application_fee_amount`, an INTEGER in the charge's minor unit (öre for SEK).
 * We compute it server-side from a per-shop rate in BASIS POINTS (500 = 5.00%);
 * basis points keep the math pure-integer and avoid the float drift the
 * checkout's total-parity invariant already guards against.
 *
 * The fee is taken off the GROSS (VAT-inclusive) total because the PLATFORM is
 * the VAT merchant of record (no Stripe `on_behalf_of`). The buyer's charge is
 * unchanged; the connected shop receives (gross − fee) as the transfer.
 */
/**
 * @param amountOre  the gross charge amount in öre (Math.round(totalSEK * 100))
 * @param bps        the platform commission in basis points (0..10000)
 * @returns          the application_fee_amount in öre, clamped to [0, amountOre]
 */
export declare function computeApplicationFeeOre(amountOre: number, bps: number): number;
/**
 * Resolve the effective per-shop commission (basis points):
 *   shop.payments.commissionBps  (if a valid integer)
 *   ?? platform default (settings/platform.defaultCommissionBps, passed in)
 * The caller supplies the platform default (read once from settings/platform,
 * falling back to commerceConfig.defaultCommissionBps).
 */
export declare function resolveCommissionBps(shopCommissionBps: unknown, platformDefaultBps: number): number;
