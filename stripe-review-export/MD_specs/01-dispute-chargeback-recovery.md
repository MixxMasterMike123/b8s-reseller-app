# 01 — Dispute / chargeback recovery

**Priority:** P0 (direct financial exposure)
**Status:** ✅ Specified — verify against acceptance criteria.

## Purpose
Recover disputed funds from the connected account. On destination charges Stripe debits the
**platform** balance for a dispute; today the code only records the dispute, so the platform
eats every lost chargeback unless reconciled by hand.

## Current state (from the export)
`functions/src/payment/stripeWebhook.ts` (~L371-395) stamps `charge.dispute.created`
(`disputeStatus/disputedAt/disputeId`) onto the order and **moves no money**. No transfer
reversal, no dispute-lifecycle handling, no negative-balance detection.

## Requirements
1. On `charge.dispute.created`: create a **transfer reversal** on the original transfer to pull
   the disputed amount back from the connected account. Persist reversal id + status on the order.
2. On `charge.dispute.closed`:
   - **won** → re-transfer the reversed amount back to the connected account;
   - **lost** → finalize/reconcile (no re-transfer).
3. Detect connected-account **negative balance**, log it and surface it to admin; never crash.
   Note: **SE accounts do not auto-debit the seller's bank** like US/CA — Stripe holds a reserve
   and recovers from future volume only.
4. Make **"reverse on created"** vs **"wait for outcome"** a documented config flag.
   **Default: reverse-on-created** (protect the platform).
5. Idempotent webhook handling (dispute events can be redelivered).

## Acceptance criteria
- [ ] `charge.dispute.created` triggers a transfer reversal (when reverse-on-created is on) and
      stores the reversal id/status on the order.
- [ ] `charge.dispute.closed` (won) re-transfers; (lost) finalizes without re-transfer.
- [ ] Config flag exists for reverse-on-created vs wait-for-outcome, default reverse-on-created.
- [ ] Negative connected-account balance is detected, logged, and visible in admin.
- [ ] Handlers are idempotent on event redelivery.
- [ ] Tests cover: created→reverse, closed-won→re-transfer, closed-lost→finalize,
      insufficient connected balance.

## Out of scope / depends on
- If the platform migrates to **direct charges** (see 07), dispute liability shifts to the
  connected account and this recovery logic changes materially. Built for destination charges.
