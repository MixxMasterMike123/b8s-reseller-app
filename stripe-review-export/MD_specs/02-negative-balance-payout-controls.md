# 02 — Negative-balance / payout-risk controls

**Priority:** P1
**Status:** ✅ Specified — verify against acceptance criteria.

## Purpose
Manage the risk that a refund/chargeback needs to claw back from a seller whose balance is
already empty — **without** blanket-holding everyone's funds. A deliberate hold/escrow over all
sellers would push the platform toward "holding other people's money" (money-transmitter / AML
implications) and hurts the fast-payout product promise. Use targeted controls instead.

## Current state (from the export)
Payouts are **Stripe-default automatic** — no `payouts.create`, no `payouts.schedule`, no
manual/hold logic. The platform neither triggers nor holds payouts. `AdminPayments.jsx` shows
onboarding status but not per-account balances.

## Requirements
1. Ability to apply a **payout delay or reserve to specific connected accounts** (e.g. new or
   high-dispute sellers) via Stripe Connect account settings. **Do not** apply a blanket hold to
   all accounts.
2. Admin UI to set/adjust the delay/reserve per seller.
3. Surface **per-connected-account balance** (including any negative balance) in
   `AdminPayments.jsx`.

## Acceptance criteria
- [ ] A reserve / payout delay can be applied to an individual connected account from admin.
- [ ] No code path imposes a blanket hold across all accounts.
- [ ] Admin shows per-seller balance and flags negative balances.
- [ ] Tests/manual notes documenting how a reserve is applied and removed.

## Out of scope / depends on
- Pairs with 01 (dispute recovery). Reserve policy thresholds (which sellers, how much) are a
  business decision; the spec only requires the mechanism + admin control.
