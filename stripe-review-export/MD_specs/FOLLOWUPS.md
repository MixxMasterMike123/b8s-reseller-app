# DAC7 / Stripe compliance — flagged follow-ups (not deploy-blockers)

Two acceptance-criteria items remain PARTIAL after punch-list 09. Both are deliberate:
neither blocks deploy; both are noted here so they aren't lost. (See `VERIFICATION_RESULTS.md`
for the full checklist — 41 PASS / 2 PARTIAL / 0 MISSING.)

---

## FU-1 — DAC7 approved identity change should route to Stripe re-KYC (spec 05 #10)

**Current behaviour.** When the platform **approves** a seller's identity-correction request,
`resolveDac7Correction` writes the requested value straight into the authoritative record:
`dac7Sellers/{shopId}.{field} = requestedValue` (`functions/src/dac7/functions.ts:188`).

**What the spec wants.** An approved identity-key change (personnummer / org.nr / DOB) should
**route the seller to update it at Stripe (re-run KYC)** rather than overwriting a Stripe-verified
value in our DB — so the reportable identifier stays Stripe-verified, not hand-edited.

**Why it's only PARTIAL, not wrong.** The request → platform-approval flow exists and is
isolation-safe (seller can't self-approve; platform-only resolve). The gap is purely that approval
*persists the raw value* instead of *triggering re-verification*.

**Suggested fix.**
1. On approve: instead of writing `requestedValue`, stamp the field as
   `pendingStripeReverification: { field, requestedValue, requestedAt }` on `dac7Sellers/{shopId}`.
2. Surface a Stripe onboarding/account link to the seller (reuse `createConnectAccountLink` /
   `createConnectLoginLink`) so they update it at Stripe.
3. The next `pullDac7FromStripe` overwrites the field with the now-verified value and clears the
   pending flag. (Net: the identifier in our DB is always Stripe-sourced.)

**Effort:** S (one callable change + a small seller-page link + a pull-side clear). Touches no
rules. Worth doing before the first real DAC7 filing, not urgent for go-live.

---

## FU-2 — Dispute insufficient-balance/shortfall path lacks an automated test (spec 01)

**Current behaviour.** The pure dispute builders are unit-tested
(`rules-tests/dispute-recovery.test.cjs`). The **live shortfall path** — a `transfers.createReversal`
that fails because the connected account can't cover it → stamp `disputeRecoveryStatus:'shortfall'`
+ `disputeRecoveryError`, return HTTP 200 (no retry-storm) — is only covered by a **documented
Stripe-CLI recipe** (`docs/STRIPE_COMPLIANCE_REMEDIATION_PLAN.md` §4b), not an automated test.

**Why it's only PARTIAL.** The behaviour is implemented and correct
(`functions/src/payment/stripeWebhook.ts` `recoverDisputedTransfer` catch block); it just isn't
asserted by CI — because it requires a Stripe API failure, which the pure-builder harness can't
produce.

**Suggested fix (optional).** A webhook-handler unit test with a **mocked Stripe** whose
`transfers.createReversal` throws, asserting the handler returns 200 and the order is stamped
`shortfall`. Needs a Stripe SDK mock layer the repo doesn't have yet (all current tests are
pure-builder or emulator) → small new test-harness investment.

**Effort:** S–M (mostly standing up a Stripe mock). The behaviour itself is done + manually
verifiable via the CLI recipe; this is test depth, not a functional gap.

---

## FU-3 — DAC7 €2,000 de-minimis uses one annual SEK→EUR rate, not per-payment-date FX (spec 05)

**Current behaviour.** DAC7 EUR conversion happens **once at export time**: a single rate is
applied to the whole-year SEK total (`functions/src/dac7/aggregate.ts:82-83`,
`functions/src/dac7/functions.ts:396-397`), defaulting to a hardcoded placeholder
`DEFAULT_SEK_TO_EUR = 0.087` (`functions/src/dac7/functions.ts:308-310`). Orders persist SEK-only —
no `amountEur`, `fxRate`, or rate-date field on `order.payment`/`order.connect`
(`functions/src/payment/stripeWebhook.ts:310-322`). There is **no `transfer.*` / `payout.*` webhook
handler** (only `payment_intent.succeeded`, `account.updated`, dispute events).

**What the statute shows.** Skatteverket Rättslig vägledning 415199 (Lag 2022:1681, 2 kap. 17 § 4)
worked example converts **per payment at each payment-date FX rate**, then sums
(`11000/11.34 + 8000/11.84 = €1,646`). Single-annual-rate vs per-payment can produce a **different
EUR total**, which can flip the de-minimis result for a seller near the €2,000 line.

**Why it's a gap vs the statute, not a bug.** This was a *documented decision* — the spec
(`05-dac7-seller-data-and-reporting.md` #29-32) and plan
(`docs/STRIPE_COMPLIANCE_REMEDIATION_PLAN.md:136`) both say "store SEK, convert at report time with
a documented rate source." The code matches the spec. The open question is whether the spec's
simpler method is acceptable to the tax authority.

**Decision needed (compliance advisor).** For the 2026 filing: is a single documented annual
SEK→EUR rate acceptable, or is per-payment conversion at payment-date FX required?
- If **annual rate is fine** → only fix is replacing the `0.087` placeholder with a documented
  official rate (ECB year-average or Skatteverket's published rate). **Effort: XS.**
- If **per-payment is required** → architectural: pull FX at payment-intent time, persist
  `amountEur` + `fxRate` + `rateDate` on the order, ideally add a `transfer.*` webhook. **Cannot be
  back-computed cleanly** (historical daily ECB rates would need backfilling), so decide early.
  **Effort: M.**

**Matters most near the €2,000 boundary and for audit/appeal defensibility** (today the per-payment
EUR trail can't be reconstructed). See memory `dac7_thresholds.md` for the authoritative threshold
mechanics. **Effort: XS if status quo confirmed, M if per-payment mandated.**

---

## FU-4 — Mandatory "ångerfunktion" (withdrawal function) in force 19 June 2026 — likely not implemented

**The rule (NEW, effective 2026-06-19).** DAL was updated (2 kap. 10 a § / 3 kap. 14 §): any contract
concluded on a website or app must provide a dedicated **withdrawal function** ("ångerfunktion"),
available on the same site/app **throughout the entire withdrawal period**, that:
1. is easy to find + clearly labelled ("ångra avtalet här" or equivalent);
2. lets the consumer identify the order + submit (or confirm) the withdrawal;
3. issues a **mottagningsbevis** (acknowledgment of receipt) in durable form (e.g. email) stating
   **what** was withdrawn and **when** the message was received.

**Scope.** ALL distance sales concluded via web/app — NOT just POD, NOT just the goods that carry a
14-day right. (Source: Konsumentverket, "Informationskrav vid distansavtal — regler för företag",
granskad 2025-12-14.)

**Why this is flagged urgently.** The effective date is **already past** (19 June 2026). Unlike
FU-1/2/3 this is not a refinement — it's a structural feature the storefront/account UI must add, and
the current code almost certainly has no such function or mottagningsbevis flow. This is a live
compliance gap, broader than the Stripe/POD scope of this folder, surfaced here because it came out
of the same ångerrätt research.

**Suggested shape (not built — facts-only pass).** A storefront "Ångra köp" surface (reachable for
the whole frist) that looks up an order, records the withdrawal, and emails a durable
mottagningsbevis. Interacts with the POD A/B regime (Regime B personalized orders are exempt → the
function should reflect "ingen ångerrätt" where Art. 16(c) applies, but the function itself must
still exist for non-exempt sales). See memory `angerratt_pod.md` for the full legal basis.

**Effort:** M (new storefront surface + durable-email acknowledgment + order-lookup; must respect the
A/B exemption logic). **Has a past effective date — treat as the highest-priority item in this file**,
pending Mikael's go + the parked legal review.

**STATUS — BUILT 2026-06-30 (local-verified, NOT deployed).** Implemented the ångerfunktion:
- Server callable `submitWithdrawal` (`functions/src/withdrawal/functions.ts`, registered in
  `functions/src/index.ts`): server-authoritative — verifies order ownership (B2C auth uid / email)
  + shopId parity, enforces eligibility (Regime A applies / Regime B `withdrawal.required` → exempt /
  >30-day window → closed), **stamps submission time server-side** (the legal proof), persists
  `order.withdrawalRequest` with a durable **acknowledgement of receipt** (content + date/time),
  idempotent (transaction). NEVER writes `isPersonalized` — only reads it (firewall held).
- Email type `WITHDRAWAL_ACKNOWLEDGMENT` added to `EmailOrchestrator` (inline Swedish mottagningsbevis
  template + from-address). Fired **best-effort** via lazy import — a broken SMTP transport (see
  memory email-smtp-rearchitecture) CANNOT fail the withdrawal; the persisted record + on-screen
  receipt already satisfy the durable-medium duty.
- Storefront `OrderWithdrawal.jsx` in `CustomerAccount.jsx` Orders tab: label **"Ångra köp"**,
  statement (name + order ref + confirmation email = Art. 11a(2) fields), confirm control
  **"Bekräfta ångra"** (Art. 11a(3)), on-screen savable mottagningsbevis after submit, and the
  "ingen ångerrätt" notice for personalised orders. i18n via `t()` with Swedish fallbacks.
- Verified: functions `tsc --noEmit` clean, web `npm run build` clean, reverse-checked ZERO changes
  to products/cart/checkout/webhook order-creation.
- **Deliberate scope lines:** (a) availability = non-exempt orders within a generous 30-day window
  (no trustworthy `deliveredAt` exists → over-available is legally safe, under-available is the
  violation; precise `deliveredAt+14d` countdown is a later change); (b) refund processing
  (artist-bears allocation) is downstream, not part of the function.
- ⛔ NOT deployed (awaiting explicit go). The acknowledgement EMAIL leg won't deliver until the email
  re-architecture is done — but the durable record + on-screen receipt cover the legal duty meanwhile.

---

## Status of the four
- FU-1 is a flow refinement that matters for filing integrity, not go-live correctness.
- FU-2 is test coverage; the path works and is manually verifiable.
- FU-3 is a spec-vs-statute FX-method question pending an advisor call; status quo matches the spec.
- FU-4 is a NEW statutory duty (ångerfunktion) with a *past* effective date — likely unimplemented;
  highest priority here, though it sits outside the original Stripe/POD remediation scope.
None of FU-1/2/3 gate the original deploy; FU-4 is a standalone live compliance gap.
