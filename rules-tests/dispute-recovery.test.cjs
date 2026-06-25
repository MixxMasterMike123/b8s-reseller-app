/**
 * Stripe Connect — dispute/chargeback recovery param unit tests (Slice A).
 *
 * Asserts the EXACT params the webhook's dispute handlers send to Stripe, via
 * the pure builders the handlers call (functions/src/payment/connectParams.ts
 * → compiled lib). These are the money bugs that would actually hurt: failing
 * to reverse a disputed transfer (platform eats the chargeback), reversing a
 * legacy order that has no transfer, double-reversing, or re-transferring the
 * wrong amount when a dispute is won.
 *
 * NOTE: the live stripe.transfers.createReversal / .create calls and the
 * negative-balance/shortfall handling live in the webhook and are NOT unit-
 * testable without Stripe — they are exercised via the documented Stripe-CLI
 * recipe in docs/STRIPE_COMPLIANCE_REMEDIATION_PLAN.md. These tests pin the
 * decision logic that decides whether/what to reverse and re-transfer.
 *
 * RUN: node rules-tests/dispute-recovery.test.cjs
 */
const path = require('path');
const LIB = path.join(__dirname, '..', 'functions', 'lib', 'payment');
const { buildDisputeReversalParams, buildDisputeReTransferParams } = require(path.join(LIB, 'connectParams'));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };

console.log('\n=== Dispute reversal (charge.dispute.created → claw back from shop) ===');

// Connect order with a transfer → reverse it (full), recover the fee by default.
{
  const order = {
    payment: { paymentIntentId: 'pi_1', currency: 'sek' },
    connect: { isDestinationCharge: true, transferId: 'tr_1', connectedAccountId: 'acct_1', transferReversed: false },
    disputeId: 'dp_1',
  };
  const r = buildDisputeReversalParams(order);
  ok(r !== null, 'Connect order with transfer → reversal built');
  ok(r.transferId === 'tr_1', 'reversal targets the recorded transfer tr_1');
  ok(!('amount' in r.params), 'FULL reversal (no amount → entire remaining transfer)');
  // MONEY-CORRECTNESS: refund_application_fee=false on a REVERSAL keeps the
  // platform whole. true would CREDIT the fee to the connected account (the
  // reversal un-does the original fee deduction) → shop would profit on a
  // chargeback. So a dispute reversal is always false. See connectParams.ts.
  ok(r.params.refund_application_fee === false, 'dispute reversal: refund_application_fee FALSE (platform stays whole; shop nets 0)');
  ok(r.params.metadata.reason === 'dispute_recovery', 'metadata tags the reversal reason');
  ok(r.params.metadata.disputeId === 'dp_1', 'metadata carries the disputeId');
}

// LEGACY order (no connect) → null (platform already bore it; nothing to claw).
{
  const order = { payment: { paymentIntentId: 'pi_3' } };
  ok(buildDisputeReversalParams(order) === null, 'legacy order → no reversal (null)');
}

// Connect order MISSING transferId → null (caller must alert; cannot reverse).
{
  const order = { payment: { paymentIntentId: 'pi_4' }, connect: { isDestinationCharge: true, connectedAccountId: 'acct_4' } };
  ok(buildDisputeReversalParams(order) === null, 'Connect order with NO transferId → null (no broken reversal)');
}

// Already reversed (refund or prior dispute) → null (idempotent).
{
  const order = { payment: { paymentIntentId: 'pi_5' }, connect: { isDestinationCharge: true, transferId: 'tr_5', transferReversed: true } };
  ok(buildDisputeReversalParams(order) === null, 'already-reversed transfer → null (idempotent, no double reversal)');
}

console.log('\n=== Dispute re-transfer (charge.dispute.closed=won → send funds back) ===');

// Won after a reversal → re-transfer exactly the reversed amount to the shop.
{
  const order = {
    payment: { paymentIntentId: 'pi_6', currency: 'sek' },
    connect: { isDestinationCharge: true, transferId: 'tr_6', connectedAccountId: 'acct_6', transferReversed: true, disputeReversedAmount: 11875 },
    disputeId: 'dp_6',
  };
  const t = buildDisputeReTransferParams(order);
  ok(t !== null, 'won + prior reversal → re-transfer built');
  ok(t.params.amount === 11875, 're-transfer amount = exactly the reversed öre (no over/under-send)');
  ok(t.params.destination === 'acct_6', 're-transfer destination = the connected account');
  ok(t.params.currency === 'sek', 're-transfer currency mirrors the charge');
  ok(t.params.metadata.reason === 'dispute_won_retransfer', 'metadata tags the won re-transfer');
}

// Won but NOTHING was reversed → null (nothing to send back).
{
  const order = { payment: { paymentIntentId: 'pi_7' }, connect: { isDestinationCharge: true, connectedAccountId: 'acct_7', transferReversed: false } };
  ok(buildDisputeReTransferParams(order) === null, 'won with no prior reversal → null (nothing to return)');
}

// Already re-transferred → null (idempotent).
{
  const order = { payment: { paymentIntentId: 'pi_8' }, connect: { isDestinationCharge: true, connectedAccountId: 'acct_8', transferReversed: true, disputeReversedAmount: 5000, disputeReTransferId: 'tr_re_8' } };
  ok(buildDisputeReTransferParams(order) === null, 'already re-transferred → null (no double send)');
}

// Reversed amount missing/zero → null (never send a bogus transfer).
{
  const order = { payment: { paymentIntentId: 'pi_9' }, connect: { isDestinationCharge: true, connectedAccountId: 'acct_9', transferReversed: true, disputeReversedAmount: 0 } };
  ok(buildDisputeReTransferParams(order) === null, 'zero reversed amount → null (no bogus re-transfer)');
}

// Legacy order → null.
{
  ok(buildDisputeReTransferParams({ payment: { paymentIntentId: 'pi_10' } }) === null, 'legacy order → no re-transfer (null)');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
