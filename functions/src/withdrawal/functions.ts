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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/database';
import { appUrls } from '../config/app-urls';

const COMMON = {
  region: 'us-central1' as const,
  memory: '256MiB' as const,
  timeoutSeconds: 60,
  cors: appUrls.CORS_ORIGINS,
  // Mottagningsbevis email transport (best-effort send after the withdrawal
  // is durably recorded).
  secrets: ['RESEND_API_KEY'],
};

// Absolute cap after which no ångerfrist can possibly still be running:
// 14 days (frist) + 365 days (max extension when the right was not properly
// disclosed, DAL 2 kap. 12 § 4 st.) + slack for delivery time between order
// creation and the consumer receiving the goods. Refusing before this point
// would risk refusing a legally valid withdrawal.
const ABSOLUTE_MAX_AGE_DAYS = 450;

// Rate limiting for the UNAUTHENTICATED (guest) path: per-instance in-memory
// counter keyed by caller IP. The real ownership barrier is knowledge of BOTH
// the order number and the purchase email; this just makes enumeration
// impractical. Authenticated calls are not limited (they carry an identity).
const guestAttempts = new Map<string, { count: number; windowStart: number }>();
const GUEST_WINDOW_MS = 10 * 60 * 1000;
const GUEST_MAX_ATTEMPTS = 10;

function guestRateLimitOk(ip: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (guestAttempts.size > 5000) {
    for (const [k, v] of guestAttempts) {
      if (now - v.windowStart > GUEST_WINDOW_MS) guestAttempts.delete(k);
    }
  }
  const entry = guestAttempts.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > GUEST_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  guestAttempts.set(ip, entry);
  return entry.count <= GUEST_MAX_ATTEMPTS;
}

interface WithdrawalStatement {
  name?: string;
  contactEmail?: string;
}

function asTrimmed(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Resolve the order document by orderNumber within a shop. Order numbers are
 * generated uppercase ("B8S-123456-AB1C") but consumers may type them lowercase
 * or with a leading '#'.
 */
async function findOrderRefByNumber(shopId: string, rawOrderNumber: string) {
  const normalized = rawOrderNumber.replace(/^#/, '').trim();
  const candidates = [...new Set([normalized, normalized.toUpperCase()])].filter(Boolean);
  for (const candidate of candidates) {
    const q = await db
      .collection('orders')
      .where('shopId', '==', shopId)
      .where('orderNumber', '==', candidate)
      .limit(1)
      .get();
    if (!q.empty) return q.docs[0].ref;
  }
  return null;
}

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
export const submitWithdrawal = onCall(COMMON, async (request) => {
  const uid = request.auth?.uid || null;

  const shopId = asTrimmed(request.data?.shopId);
  const orderId = asTrimmed(request.data?.orderId);
  const orderNumber = asTrimmed(request.data?.orderNumber);
  const statement: WithdrawalStatement = request.data?.statement || {};
  const statementEmail = asTrimmed(statement.contactEmail).toLowerCase();

  if (!shopId || (!orderId && !orderNumber)) {
    throw new HttpsError('invalid-argument', 'shopId and orderId or orderNumber are required.');
  }
  // The guest path carries no identity at all — require the two knowledge
  // factors up front and rate-limit by IP.
  if (!uid) {
    if (!orderNumber || !statementEmail) {
      throw new HttpsError('invalid-argument', 'orderNumber and contactEmail are required.');
    }
    const ip = asTrimmed(request.rawRequest?.ip) || 'unknown';
    if (!guestRateLimitOk(ip)) {
      throw new HttpsError('resource-exhausted', 'Too many attempts. Try again later.');
    }
  }

  const orderRef = orderId
    ? db.collection('orders').doc(orderId)
    : await findOrderRefByNumber(shopId, orderNumber);
  if (!orderRef) {
    // Generic message — do not reveal whether the order number exists.
    throw new HttpsError('not-found', 'Order not found.');
  }

  // Transaction: read order, verify ownership + shop parity + eligibility, then
  // stamp the withdrawal request atomically (idempotent — cannot withdraw twice).
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }
    const order = snap.data() as any;

    // Tenant-isolation parity: the order must belong to the named shop.
    if ((order.shopId || '') !== shopId) {
      throw new HttpsError('not-found', 'Order not found.');
    }

    const orderEmail = asTrimmed(order.customerInfo?.email).toLowerCase();

    // Ownership — one of three proofs:
    //  1) the order carries the caller's auth uid (account purchase),
    //  2) the caller's VERIFIED token email matches the purchase email
    //     (email_verified required: Firebase accounts can be created with any
    //     unverified address, which must not unlock someone else's order),
    //  3) guest proof: the caller supplied the order NUMBER and a contact email
    //     that matches the purchase email (the standard order-lookup barrier —
    //     this is what makes the function available to account-less buyers).
    const ownsByUid = !!uid && !!order.b2cCustomerAuthId && order.b2cCustomerAuthId === uid;
    const tokenEmail = asTrimmed(request.auth?.token?.email).toLowerCase();
    const tokenEmailVerified = request.auth?.token?.email_verified === true;
    const ownsByVerifiedTokenEmail = tokenEmailVerified && !!tokenEmail && !!orderEmail && tokenEmail === orderEmail;
    const ownsByStatementEmail = !!orderNumber && !!statementEmail && !!orderEmail && statementEmail === orderEmail;
    if (!ownsByUid && !ownsByVerifiedTokenEmail && !ownsByStatementEmail) {
      // Same generic error on mismatch as on a missing order — no enumeration.
      throw new HttpsError(
        uid ? 'permission-denied' : 'not-found',
        uid ? 'You can only withdraw your own order.' : 'Order not found.'
      );
    }

    // Idempotency: if a withdrawal was already received, return that record.
    if (order.withdrawalRequest && order.withdrawalRequest.status === 'received') {
      return {
        alreadyReceived: true,
        eligible: true,
        acknowledgement: order.withdrawalRequest.acknowledgement || null,
      };
    }

    // Regime B (Art. 16(c) exempt): personalised / made-to-order. The function
    // still responds — it reflects that no withdrawal right applies. We do NOT
    // record a withdrawal request for an exempt order.
    if (order.withdrawal && order.withdrawal.required === true) {
      return {
        eligible: false,
        reason: 'personalized_exempt',
      };
    }

    // Absolute availability cap (see ABSOLUTE_MAX_AGE_DAYS). Within the cap the
    // submission is always ACCEPTED and time-stamped — timeliness against the
    // actual frist (delivery-date dependent) is assessed by the shop, not here.
    const createdAtMs = typeof order.createdAt?.toMillis === 'function'
      ? order.createdAt.toMillis()
      : (order.createdAt ? new Date(order.createdAt).getTime() : 0);
    const ageDays = createdAtMs ? (Date.now() - createdAtMs) / 86400000 : Infinity;
    if (ageDays > ABSOLUTE_MAX_AGE_DAYS) {
      return {
        eligible: false,
        reason: 'window_passed',
      };
    }

    // Eligible — stamp the withdrawal request. submittedAt is the legal proof of
    // time (server-set, never client-set).
    const submittedAtIso = new Date().toISOString();
    const name = asTrimmed(statement.name) || asTrimmed(order.customerInfo?.name);
    const contactEmail = statementEmail || orderEmail;
    const resolvedOrderNumber = asTrimmed(order.orderNumber) || orderRef.id;

    // The acknowledgement of receipt (mottagningsbevis): its CONTENT + the DATE
    // and TIME of submission, naming the withdrawn goods (Konsumentverket). This
    // is the durable record — returned to the client for an on-screen savable
    // receipt and used as the email body.
    const acknowledgement = {
      orderNumber: resolvedOrderNumber,
      withdrawnItems: Array.isArray(order.items)
        ? order.items.map((it: any) => ({ name: it?.name || '', sku: it?.sku || '', quantity: it?.quantity || 1 }))
        : [],
      consumerName: name,
      contactEmail,
      submittedAt: submittedAtIso,
      statement:
        `Jag, ${name}, ångrar härmed mitt köp av order ${resolvedOrderNumber}. ` +
        `Detta meddelande togs emot ${submittedAtIso}.`,
    };

    tx.update(orderRef, {
      withdrawalRequest: {
        status: 'received',
        submittedAt: FieldValue.serverTimestamp(),
        submittedAtIso, // human-readable mirror for the durable receipt
        name,
        contactEmail,
        // Which proof admitted the caller + order age at submission — for the
        // shop's timeliness/validity assessment, not part of the receipt.
        channel: ownsByUid || ownsByVerifiedTokenEmail ? 'account' : 'public_function',
        orderAgeDaysAtSubmission: Number.isFinite(ageDays) ? Math.round(ageDays) : null,
        acknowledgement,
        statementContent: acknowledgement.statement,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { eligible: true, acknowledgement };
  });

  // Best-effort acknowledgement email (the durable medium the consumer specified
  // — DAL 2 kap. 10 a § 3 st.). A broken transport must NOT fail the call — the
  // persisted record + on-screen receipt already satisfy the durable-medium duty.
  // (Email system is being re-architected; see memory email-smtp-rearchitecture.)
  if (result?.eligible && result?.acknowledgement && !result?.alreadyReceived) {
    try {
      // Lazy import so an EmailService construction error (missing SMTP creds)
      // cannot abort the withdrawal that already succeeded above.
      const { EmailOrchestrator } = await import('../email-orchestrator/core/EmailOrchestrator');
      const orchestrator = new EmailOrchestrator();
      await orchestrator.sendEmail({
        emailType: 'WITHDRAWAL_ACKNOWLEDGMENT' as any,
        customerInfo: { email: result.acknowledgement.contactEmail, name: result.acknowledgement.consumerName },
        orderId: orderRef.id,
        orderData: { orderNumber: result.acknowledgement.orderNumber, acknowledgement: result.acknowledgement },
        additionalData: { acknowledgement: result.acknowledgement },
        language: 'sv-SE',
        shopId, // tenant identity: mottagningsbeviset sends as the SHOP
      } as any);
    } catch (err: any) {
      // Log and continue — the withdrawal is already legally recorded.
      logger.warn('submitWithdrawal: acknowledgement email failed (withdrawal still recorded)', {
        orderId: orderRef.id,
        error: err?.message || String(err),
      });
    }
  }

  return result;
});
