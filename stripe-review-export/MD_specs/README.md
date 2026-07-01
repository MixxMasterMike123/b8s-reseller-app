# Stripe + compliance work packages — spec & verification checklist

Handoff and verification specs for the platform (repo: `b8shield_portal` — React/Vite client +
Firebase Cloud Functions in `functions/src`). Each file is one work package with **acceptance
criteria** so you can confirm the implementation matches what was specified ("is CC in phase?").

These specs cover the **code** side. The **legal** side (Skatteverket DAC7 registration, VAT
position, jurist sign-off on the two contracts) is handled separately and noted where it
intersects.

## Status legend
- ✅ **Specified — should now be implemented.** Verify against acceptance criteria.
- ⏸️ **Decision pending — intentionally NOT implemented.** Scope/estimate only.

## Work packages

| # | File | Priority | Status |
|---|------|----------|--------|
| 01 | `01-dispute-chargeback-recovery.md` | P0 (financial exposure) | ✅ |
| 02 | `02-negative-balance-payout-controls.md` | P1 | ✅ |
| 03 | `03-platform-fee-refund-config.md` | small | ✅ |
| 04 | `04-pod-withdrawal-checkout.md` | P1 (consumer law) | ✅ |
| 05 | `05-dac7-seller-data-and-reporting.md` | P0 (legal obligation) | ✅ |
| 06 | `06-b2c-individual-sellers.md` | P1 | ✅ |
| 07 | `07-charge-model-decision.md` | gating decision | ⏸️ |

## Suggested order
1. **05 (DAC7)** and **01 (dispute recovery)** first — both P0. DAC7 was the last to be built;
   use its acceptance criteria to confirm completeness.
2. **03**, **04**, **06** — independent, can land in any order.
3. **02** — payout-risk controls; pairs with 01.
4. **07** — the one open decision (destination vs direct charges). Everything else is built to
   work **regardless** of how 07 is decided; only the refund/dispute code *shape* changes if you
   migrate to direct charges.

## The one thing that still gates everything: 07
Charge model = destination (current) vs direct. It is a business/legal/VAT decision, not a
technical preference, so it was scoped but not implemented. See `07-charge-model-decision.md`.

## Baseline (from the Stripe review export, 2026-06-25)
- Charge type: **destination charges** (`transfer_data.destination` + `application_fee_amount`,
  **no** `on_behalf_of`). Platform is merchant of record; funds transit the platform balance.
- Connected accounts: **Stripe Express**, hosted onboarding (Stripe does KYC).
- Split: **two-party** (platform fee + shop owner). No printer in the money flow. (Three-way
  split was planned, not built — out of scope here.)
- Refunds: `reverse_transfer: true` + `refund_application_fee: true`.
- Disputes: stamped only, no recovery (see 01). DAC7/tax reporting: none (see 05).
