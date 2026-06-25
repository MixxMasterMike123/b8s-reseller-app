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

## Both deferred deliberately
- FU-1 is a flow refinement that matters for filing integrity, not go-live correctness.
- FU-2 is test coverage; the path works and is manually verifiable.
Neither gates the deploy.
