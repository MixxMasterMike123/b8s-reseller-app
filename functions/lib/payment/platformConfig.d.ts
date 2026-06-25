/**
 * Platform-level Stripe config — the single reader for `settings/platform`.
 *
 * Centralises the platform's money-policy flags so the pure param builders
 * (connectParams.ts / connectFee.ts) stay pure + unit-testable while the I/O
 * lives in one place. Each flag has an env fallback and a safe default, so a
 * missing `settings/platform` doc (or a missing field) never changes today's
 * behaviour.
 *
 * Fields:
 *   defaultCommissionBps   — platform's default cut in basis points (existing).
 *   refundApplicationFee   — on a Connect refund, also return the platform fee
 *                            to the buyer (true = current behaviour). Set false
 *                            to keep the fee as a non-refundable service fee.
 *   reverseDisputeOnCreated— on charge.dispute.created, immediately reverse the
 *                            transfer to claw the disputed amount back from the
 *                            connected account (true = protect the platform).
 *                            false = wait for the dispute outcome before moving
 *                            money.
 */
export interface PlatformPaymentConfig {
    defaultCommissionBps: number;
    refundApplicationFee: boolean;
    reverseDisputeOnCreated: boolean;
}
/** The defaults the system runs on when settings/platform has no override. */
export declare function platformConfigDefaults(): PlatformPaymentConfig;
/**
 * Read settings/platform once and overlay any present fields onto the defaults.
 * Never throws — a read failure falls back to env/defaults (today's behaviour).
 */
export declare function readPlatformConfig(): Promise<PlatformPaymentConfig>;
