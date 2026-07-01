# 03 — Platform-fee-on-refund config

**Priority:** small
**Status:** ✅ Specified — verify against acceptance criteria.

## Purpose
Make it a configurable policy whether the platform **keeps or refunds its fee** when a customer
withdrawal/refund occurs, instead of hardcoding it. (Whether to keep the fee is a
legal/commercial decision — keeping a commission on a sale that never completed is harder to
defend than a fixed non-refundable service fee — so the code should support either.)

## Current state (from the export)
`functions/src/payment/connectRefund.ts` + `connectParams.ts` (~L70-73) hardcode
`reverse_transfer: true` + `refund_application_fee: true`, i.e. the platform's fee is **refunded**
on every full refund.

## Requirements
1. Extract `refund_application_fee` behavior into a **single config flag** in `settings/platform`.
2. **Default: true** (current behavior — fee refunded on withdrawal).
3. `reverse_transfer` stays true regardless (the seller's share is always clawed back).

## Acceptance criteria
- [ ] One config value controls `refund_application_fee`; default true.
- [ ] Refund path reads the flag; no other behavioral change at default.
- [ ] Tests cover flag = true (fee returned) and flag = false (platform keeps fee).

## Out of scope / depends on
- The actual policy choice (keep vs refund) is pending and may differ for individual vs company
  sellers; this spec only delivers the switch.
