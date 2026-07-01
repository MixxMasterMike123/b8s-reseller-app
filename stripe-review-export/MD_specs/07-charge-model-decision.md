# 07 — Charge model decision: destination vs direct

**Priority:** gating business/legal decision
**Status:** ⏸️ **Decision pending — intentionally NOT implemented.** Scope + estimate only.

## Why this is a decision, not a task
The choice between destination charges (current) and direct charges is a business/legal/VAT
decision, not a technical preference. It determines merchant-of-record, who carries chargeback
liability, whether funds transit the platform balance, and who is VAT merchant of record. So it
was scoped but not built. Everything else in this folder is built to work **regardless** of how
this is decided; only the refund/dispute code *shape* changes if you migrate.

## Current (destination charges)
- Platform is **merchant of record** toward the cardholder (no `on_behalf_of`).
- Funds **transit the platform balance**; Stripe routes the principal to the connected account.
- Platform is **liable for chargebacks** (debited from platform balance — see 01).
- Platform is **VAT merchant of record** (the no-`on_behalf_of` choice was deliberate, per the
  code comment) — this needs a hard look with the accountant, because "platform = VAT MoR" sits
  uneasily with "platform is only a technical provider, the shop owner is the seller."

## Direct charges (the alternative)
- Shop owner becomes merchant of record; charge settles on their account.
- Chargeback liability and funds move **off** the platform — cleaner "just a technical provider"
  position. Shop owner files their own tax forms; the platform never sees the gross.
- **Changes who is VAT merchant of record** — tied to the accountant decision above.
- Shop owner sees Stripe's full MoR experience.

## What CC was asked to produce (not to implement)
1. A **migration plan** destination → direct: files touched, effort estimate.
2. The **tradeoffs in code**: refunds, disputes, `on_behalf_of`, fee collection.
3. **No change to the charge type yet.**

## Decision inputs (for Micke + accountant + jurist)
- VAT: who should be the VAT taxable person for the goods (almost certainly the shop owner, not
  the platform).
- AML: staying incidental inside Stripe's licensed flow vs anything that looks like holding funds.
- Positioning: keeping "technical provider, not seller" clean (favours direct).
- UX: onboarding/receipt experience for sellers.

## Once decided
- If **direct**: re-shape 01 (dispute liability moves to seller) and the refund path; revisit the
  §3 merchant-of-record wording in the platform contract.
- If **destination (stay)**: keep 01 as built; soften the contract's "not merchant of record"
  wording (the platform IS MoR); confirm the VAT position explicitly.
