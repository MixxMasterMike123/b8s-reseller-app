"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPlatformConfig = exports.platformConfigDefaults = void 0;
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
// Env fallbacks. A bare env var is a string; we parse the booleans explicitly so
// only the literal 'false' / '0' turns a default-true flag off.
function envBool(name, dflt) {
    const raw = (process.env[name] || '').trim().toLowerCase();
    if (raw === '')
        return dflt;
    if (raw === 'false' || raw === '0' || raw === 'no')
        return false;
    if (raw === 'true' || raw === '1' || raw === 'yes')
        return true;
    return dflt;
}
/** The defaults the system runs on when settings/platform has no override. */
function platformConfigDefaults() {
    return {
        defaultCommissionBps: app_urls_1.commerceConfig.defaultCommissionBps,
        refundApplicationFee: envBool('REFUND_APPLICATION_FEE', true),
        reverseDisputeOnCreated: envBool('REVERSE_DISPUTE_ON_CREATED', true),
    };
}
exports.platformConfigDefaults = platformConfigDefaults;
/**
 * Read settings/platform once and overlay any present fields onto the defaults.
 * Never throws — a read failure falls back to env/defaults (today's behaviour).
 */
async function readPlatformConfig() {
    const cfg = platformConfigDefaults();
    try {
        const snap = await database_1.db.collection('settings').doc('platform').get();
        if (!snap.exists)
            return cfg;
        const d = snap.data() || {};
        if (Number.isInteger(d.defaultCommissionBps))
            cfg.defaultCommissionBps = d.defaultCommissionBps;
        if (typeof d.refundApplicationFee === 'boolean')
            cfg.refundApplicationFee = d.refundApplicationFee;
        if (typeof d.reverseDisputeOnCreated === 'boolean')
            cfg.reverseDisputeOnCreated = d.reverseDisputeOnCreated;
    }
    catch {
        /* keep env/defaults */
    }
    return cfg;
}
exports.readPlatformConfig = readPlatformConfig;
//# sourceMappingURL=platformConfig.js.map