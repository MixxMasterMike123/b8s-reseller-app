/**
 * submitLead — public callable behind the landing-page "Vill du ha en egen
 * butik?" form. Visitors are prospective MERCHANTS, so leads are PLATFORM-level
 * (no shopId stamped). Writes a `leads` doc first (the lead must never be lost),
 * then fires a best-effort admin notification email — a failing email transport
 * must NOT fail the submission.
 *
 * Abuse guard is deliberately cheap: trim + length caps + a hidden `website`
 * honeypot field (humans never see it; bots fill it). No rate-limit infra.
 * Firestore rules: `leads` is platform-read-only and never client-writable —
 * this Admin SDK write is the only way in.
 */
interface SubmitLeadRequest {
    name?: string;
    company?: string;
    email?: string;
    message?: string;
    /** Honeypot — visually hidden in the form; any value = bot. */
    website?: string;
}
export declare const submitLead: import("firebase-functions/v2/https").CallableFunction<SubmitLeadRequest, any, unknown>;
export {};
