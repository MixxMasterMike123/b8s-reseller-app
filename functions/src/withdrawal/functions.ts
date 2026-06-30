/**
 * Ångerfunktion — consumer right-of-withdrawal function (DAL 2 kap. 10 a §,
 * transposing CRD Article 11a, inserted by EU Directive 2023/2673; in force in
 * Sweden 19 June 2026).
 *
 * The law requires that a consumer who concluded a distance contract via an
 * online interface can WITHDRAW just as easily as they concluded it, through a
 * dedicated function that is continuously available throughout the withdrawal
 * period. On submission the trader must, without undue delay, send an
 * acknowledgement of receipt on a DURABLE MEDIUM including its content + the
 * date and time of submission.
 *
 * This callable is the SERVER-AUTHORITATIVE half of that function:
 *   - it verifies the caller owns the order (B2C auth uid / email) + shop parity,
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
import { requireAuth } from '../email-orchestrator/functions/authGuard';

const COMMON = {
  region: 'us-central1' as const,
  memory: '256MiB' as const,
  timeoutSeconds: 60,
  cors: appUrls.CORS_ORIGINS,
};

// How recent an order may be and still surface the function. The statutory
// minimum frist is 14 days from receipt; we use a generous 30-day window from
// order creation so the function is never UNDER-available (over-availability is
// legally safe; under-availability is the violation). A precise deliveredAt+14d
// gate can replace this once a trustworthy delivery timestamp exists.
const WITHDRAWAL_WINDOW_DAYS = 30;

interface WithdrawalStatement {
  name?: string;
  contactEmail?: string;
}

function asTrimmed(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * submitWithdrawal — the consumer activates the confirmation function.
 * Input: { shopId, orderId, statement: { name, contactEmail } }
 * Returns either an eligibility refusal (personalised/exempt or window passed)
 * or the acknowledgement of receipt (content + submittedAt) for the on-screen
 * durable receipt.
 */
export const submitWithdrawal = onCall(COMMON, async (request) => {
  requireAuth(request.auth?.uid);
  const uid = request.auth!.uid;

  const shopId = asTrimmed(request.data?.shopId);
  const orderId = asTrimmed(request.data?.orderId);
  const statement: WithdrawalStatement = request.data?.statement || {};
  if (!shopId || !orderId) {
    throw new HttpsError('invalid-argument', 'shopId and orderId are required.');
  }

  const orderRef = db.collection('orders').doc(orderId);

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

    // Ownership: the caller must own this order. B2C orders carry the customer's
    // auth uid; fall back to an email match for older orders that linked by email.
    const ownsByUid = order.b2cCustomerAuthId && order.b2cCustomerAuthId === uid;
    const callerEmail = asTrimmed(request.auth?.token?.email).toLowerCase();
    const orderEmail = asTrimmed(order.customerInfo?.email).toLowerCase();
    const ownsByEmail = !!callerEmail && !!orderEmail && callerEmail === orderEmail;
    if (!ownsByUid && !ownsByEmail) {
      throw new HttpsError('permission-denied', 'You can only withdraw your own order.');
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

    // Availability window (see WITHDRAWAL_WINDOW_DAYS). createdAt may be a
    // Firestore Timestamp or a Date.
    const createdAtMs = typeof order.createdAt?.toMillis === 'function'
      ? order.createdAt.toMillis()
      : (order.createdAt ? new Date(order.createdAt).getTime() : 0);
    const ageDays = createdAtMs ? (Date.now() - createdAtMs) / 86400000 : Infinity;
    if (ageDays > WITHDRAWAL_WINDOW_DAYS) {
      return {
        eligible: false,
        reason: 'window_passed',
      };
    }

    // Eligible — stamp the withdrawal request. submittedAt is the legal proof of
    // time (server-set, never client-set).
    const submittedAtIso = new Date().toISOString();
    const name = asTrimmed(statement.name) || asTrimmed(order.customerInfo?.name);
    const contactEmail = asTrimmed(statement.contactEmail) || orderEmail;
    const orderNumber = asTrimmed(order.orderNumber) || orderId;

    // The acknowledgement of receipt (mottagningsbevis): its CONTENT + the DATE
    // and TIME of submission. This is the durable record — returned to the client
    // for an on-screen savable receipt and used as the email body.
    const acknowledgement = {
      orderNumber,
      withdrawnItems: Array.isArray(order.items)
        ? order.items.map((it: any) => ({ name: it?.name || '', sku: it?.sku || '', quantity: it?.quantity || 1 }))
        : [],
      consumerName: name,
      contactEmail,
      submittedAt: submittedAtIso,
      statement:
        `Jag, ${name}, ångrar härmed mitt köp av order ${orderNumber}. ` +
        `Detta meddelande togs emot ${submittedAtIso}.`,
    };

    tx.update(orderRef, {
      withdrawalRequest: {
        status: 'received',
        submittedAt: FieldValue.serverTimestamp(),
        submittedAtIso, // human-readable mirror for the durable receipt
        name,
        contactEmail,
        acknowledgement,
        statementContent: acknowledgement.statement,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { eligible: true, acknowledgement };
  });

  // Best-effort acknowledgement email (durable medium #2). A broken transport
  // must NOT fail the call — the persisted record + on-screen receipt already
  // satisfy the durable-medium duty. (Email system is being re-architected; see
  // memory email-smtp-rearchitecture.)
  if (result?.eligible && result?.acknowledgement && !result?.alreadyReceived) {
    try {
      // Lazy import so an EmailService construction error (missing SMTP creds)
      // cannot abort the withdrawal that already succeeded above.
      const { EmailOrchestrator } = await import('../email-orchestrator/core/EmailOrchestrator');
      const orchestrator = new EmailOrchestrator();
      await orchestrator.sendEmail({
        emailType: 'WITHDRAWAL_ACKNOWLEDGMENT' as any,
        customerInfo: { email: result.acknowledgement.contactEmail, name: result.acknowledgement.consumerName },
        orderId,
        orderData: { orderNumber: result.acknowledgement.orderNumber, acknowledgement: result.acknowledgement },
        additionalData: { acknowledgement: result.acknowledgement },
        language: 'sv-SE',
      } as any);
    } catch (err: any) {
      // Log and continue — the withdrawal is already legally recorded.
      logger.warn('submitWithdrawal: acknowledgement email failed (withdrawal still recorded)', {
        orderId,
        error: err?.message || String(err),
      });
    }
  }

  return result;
});
