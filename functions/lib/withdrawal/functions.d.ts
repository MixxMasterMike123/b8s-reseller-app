/**
 * Ångerfunktion — consumer right-of-withdrawal function (DAL 2 kap. 10 a §,
 * transposing CRD Article 11a, inserted by EU Directive 2023/2673; in force in
 * Sweden 19 June 2026).
 *
 * Statutory mechanics (SFS text, verified against riksdagen.se 2026-07-01):
 *   - The function must be "lättillgänglig i onlinegränssnittet UNDER HELA
 *     ÅNGERFRISTEN" and clearly labelled ("ångra avtalet här" per Konsumentverket).
 *   - In the function the consumer must be able to state/confirm: their NAME,
 *     details identifying the CONTRACT (order number), and the electronic durable
 *     form (EMAIL) in which the trader shall confirm receipt.
 *   - Submission happens by EXPRESSLY confirming the withdrawal ("bekräfta ångra").
 *   - The trader must, without delay and in the form the consumer specified, send
 *     an acknowledgement of receipt (mottagningsbevis) confirming the TIME of
 *     receipt and naming the withdrawn goods.
 *
 * This callable is the SERVER-AUTHORITATIVE half of that function:
 *   - it works for BOTH account holders (orderId + auth) and GUEST buyers
 *     (orderNumber + purchase email — checkout allows account-less purchases, and
 *     the function must be just as available to those consumers; requiring account
 *     creation would be the exact hoop-jumping Art. 11a prohibits),
 *   - it verifies the caller's link to the order (uid / verified token email /
 *     orderNumber + matching purchase email) + shopId parity,
 *   - it determines eligibility (Regime A standard = withdrawal applies; Regime B
 *     personalised = Art. 16(c) exempt — the function still responds, reflecting
 *     "ingen ångerrätt", which itself satisfies the duty to provide the function),
 *   - it stamps the submission TIME server-side (the legally load-bearing proof:
 *     withdrawal counts as exercised if submitted before the frist expires — the
 *     client must NOT set this),
 *   - it persists a durable acknowledgement record (content + date/time) on the
 *     order AND returns it to the client for an on-screen, savable mottagningsbevis,
 *   - it fires the acknowledgement email (best-effort): a failing email transport
 *     must NOT fail the withdrawal — the persisted record + on-screen receipt
 *     already satisfy the durable-medium duty. See memory angerratt_pod.md.
 *
 * AVAILABILITY WINDOW: the frist normally ends 14 days after the consumer receives
 * the goods (DAL 2 kap. 12 §) — but it never STARTS until the right is properly
 * disclosed, and expires at the latest 1 year after it would otherwise have ended.
 * The server cannot know the delivery date, so the function must NOT refuse while
 * a frist could still be running (under-availability is the violation; the
 * mottagningsbevis confirms RECEIPT of the message, not the withdrawal's
 * validity — the shop assesses validity when processing). We therefore accept and
 * record submissions up to an absolute cap after which no frist can possibly run
 * (1 year + 14 days + generous delivery slack), and stamp the order age so the
 * shop can assess timeliness.
 *
 * NOTE on the firewall: this NEVER sets isPersonalized; it only READS the order's
 * existing withdrawal.required flag (set at checkout from buyer-supplied input,
 * per src/utils/withdrawal.js + the [[pod_compliance_checkout]] firewall). Regime
 * is determined at order creation, not here.
 */
/**
 * submitWithdrawal — the consumer activates the confirmation function.
 * Input: { shopId, orderId?, orderNumber?, statement: { name, contactEmail } }
 *   - Account flow (CustomerAccount): orderId, caller authenticated.
 *   - Guest flow (public "Ångra avtalet här" page): orderNumber + contactEmail,
 *     no authentication required — proof of ownership is knowledge of the order
 *     number AND the email the order was placed with (they must match).
 * Returns either an eligibility refusal (personalised/exempt or past the absolute
 * cap) or the acknowledgement of receipt (content + submittedAt) for the
 * on-screen durable receipt.
 */
export declare const submitWithdrawal: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    alreadyReceived: boolean;
    eligible: boolean;
    acknowledgement: any;
    reason?: undefined;
} | {
    eligible: boolean;
    reason: string;
    alreadyReceived?: undefined;
    acknowledgement?: undefined;
} | {
    eligible: boolean;
    acknowledgement: {
        orderNumber: string;
        withdrawnItems: any;
        consumerName: string;
        contactEmail: string;
        submittedAt: string;
        statement: string;
    };
    alreadyReceived?: undefined;
    reason?: undefined;
}>, unknown>;
