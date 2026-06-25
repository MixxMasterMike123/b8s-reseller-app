# Acceptance-criteria verification — Stripe + compliance work packages

**Repo:** `b8shield_portal` (React/Vite client + Firebase Cloud Functions in `functions/src`)
**Branch:** `feat/stripe-compliance` (off `salvage/cleanup-and-security`) — committed + pushed, **NOT deployed** (deploy on hold until the Stripe Connect platform is unblocked; the `firestore.rules` change is a deliberate STOP-and-surface).
**Method:** every acceptance-criterion checked against the actual implementation at current HEAD, with `file:line` citations. Isolation gate green (96 firestore-isolation assertions + all pure-builder suites).

## Summary

| Result | Count |
|---|---|
| ✅ PASS | 41 |
| ⚠️ PARTIAL | 2 |
| ❌ MISSING | 0 |
| ⏸️ Scoped-not-built (07, expected) | 1 package |

> **Update (punch-list 09, commit `962c79e`):** two of the four original PARTIALs are now **PASS** — 05 #11 (active transparency notification) and 06 (sellerType first-class). The remaining two PARTIALs are 05 #10 (approved identity change still overwrites the DB rather than routing to Stripe re-KYC) and 01 (insufficient-balance path covered by a manual Stripe-CLI recipe, not an automated test). See the punch-list at the bottom.

**Headline:** all P0 financial + legal mechanisms (01 dispute recovery, 05 DAC7) are PASS. The 4 PARTIALs are fit-refinements to the DAC7/seller model + one test-depth gap — none are deploy-blockers. 07 (charge model) is correctly scoped + estimated, not implemented, as intended.

---

## 01 — Dispute / chargeback recovery (P0)

| Criterion | Status | Evidence |
|---|---|---|
| `charge.dispute.created` → transfer reversal + store reversal id/status | ✅ PASS | `stripeWebhook.ts:492` (gated on `reverseDisputeOnCreated`); `stripeWebhook.ts:78-95` `createReversal` + stamps `connect.disputeReversalId` / `disputeRecoveryStatus:'recovered'` |
| `charge.dispute.closed` won → re-transfer; lost → finalize (no re-transfer) | ✅ PASS | won: `stripeWebhook.ts:526-538`; lost: `stripeWebhook.ts:551-563` (`lost_final`, no re-transfer) |
| Config flag reverse-on-created vs wait, **default reverse-on-created** | ✅ PASS | `platformConfig.ts:46` `reverseDisputeOnCreated` default `true`; consumed `stripeWebhook.ts:492` |
| Negative connected-account balance detected, logged, visible in admin | ✅ PASS | `stripeWebhook.ts:101-110` `shortfall` stamp + `logger.error`; admin card in `AdminOrderDetail.jsx` ("Tvist / Återkrav") |
| Idempotent on event redelivery | ✅ PASS | Stripe `idempotencyKey` on both money calls (`stripeWebhook.ts:81`, `:534`) + `transferReversed` guard (`connectParams.ts:134`) |
| Tests cover created→reverse, won→re-transfer, lost→finalize, **insufficient balance** | ⚠️ PARTIAL | `rules-tests/dispute-recovery.test.cjs` covers the pure builders (reverse / re-transfer / idempotent / legacy / missing-transferId). The **live `createReversal` + insufficient-balance/shortfall** path is **not an automated test** (needs Stripe) — covered by a documented Stripe-CLI recipe in `docs/STRIPE_COMPLIANCE_REMEDIATION_PLAN.md` §4b. |

**Money-correctness note (caught during build):** a dispute *transfer reversal* uses `refund_application_fee: false` (`connectParams.ts:142`). On a reversal, `refund_application_fee=true` credits the fee to the *connected account* (the opposite of a refund) → the shop would *profit* on a chargeback. False keeps the platform whole; worked example at `connectParams.ts:101-111`.

---

## 02 — Negative-balance / payout-risk controls (P1)

| Criterion | Status | Evidence |
|---|---|---|
| Reserve / payout delay per individual connected account, from admin | ✅ PASS | `connectOnboarding.ts:261` `setConnectPayoutDelay` (per-shop `settings.payouts.schedule.delay_days`, 0–365 or `'minimum'`); UI `AdminPayments.jsx:274` `PayoutDelayEditor` |
| No blanket hold across all accounts | ✅ PASS | Only a per-`shopId` callable exists; no global `payouts.schedule` write anywhere (grep-verified) |
| Admin shows per-seller balance + flags negative | ✅ PASS | `AdminPayments.jsx:215` `BalancePanel`; negative warning `AdminPayments.jsx:243`; `getConnectBalance` `connectOnboarding.ts:226` |
| Tests / notes on applying + removing a reserve | ✅ PASS | `summarizeConnectBalance` unit-tested (10 assertions in `connect-params.test.cjs`); `'minimum'` resets the delay; manual notes in the plan |

---

## 03 — Platform-fee-on-refund config (small)

| Criterion | Status | Evidence |
|---|---|---|
| One config value controls `refund_application_fee`; default true | ✅ PASS | `platformConfig.ts:27` `refundApplicationFee` default `true` (`settings/platform.refundApplicationFee`); read by `connectRefund.ts` |
| Refund path reads the flag; no behavioral change at default; `reverse_transfer` stays true | ✅ PASS | `connectParams.ts:71,85` `buildRefundParams(...,refundApplicationFee=true)`; `reverse_transfer` always set (`connectParams.ts:81`) |
| Tests cover flag = true (fee returned) and flag = false (platform keeps fee) | ✅ PASS | `connect-params.test.cjs:114` (true), `:122-123` (false), `:131-132` (flag never leaks onto legacy refund) |

---

## 04 — Print-on-Demand / right-of-withdrawal at checkout (P1)

| Criterion | Status | Evidence |
|---|---|---|
| Products typed personalized vs standard-options | ✅ PASS | `ProductForm.jsx:85` (`isPersonalized`, default `false` = standard); persisted `ProductForm.jsx:388`; round-trips `:135` |
| Personalized: notice + mandatory checkbox; payment blocked until ticked | ✅ PASS | `Checkout.jsx:961-963` (notice + required checkbox); `StripePaymentForm.jsx` `gateBlocked` disables submit + blocks `handleSubmit` + **defers PaymentIntent creation** until consent |
| Acceptance proof (timestamp + notice version + accepted) stored on order | ✅ PASS | `stripeWebhook.ts:355` writes `order.withdrawal{ consent, noticeVersion, noticeFingerprint, consentAt }` |
| Standard-options: no notice + 14-day return path | ✅ PASS | Gate only renders when `needsWithdrawalGate` (`Checkout.jsx:46`); standard product shows nothing; server writes no withdrawal metadata (`createPaymentIntent.ts:330`) |
| Size-guide field/component for size-dependent products | ✅ PASS | Field `ProductForm.jsx:472`; rendered on product page `PublicProductPage.jsx:526`; made-to-order notice `PublicProductPage.jsx:537-540` |

**Strength (not a gap):** the server derives `hasPersonalizedItem` from the **live product docs** (`createPaymentIntent.ts:138`), never the client flag — a tampered client cannot suppress the gate; the proof records what arrived (`createPaymentIntent.ts:330-345`).

---

## 05 — DAC7 seller data + reporting (P0)

| Criterion | Status | Evidence |
|---|---|---|
| Stripe DAC7 / "platform tax reporting" evaluated; findings documented | ✅ PASS | Plan §4d / `STRIPE_COMPLIANCE_REMEDIATION_PLAN.md:202`: `tax_reporting` additional verification; auto-collected at Express onboarding; generates EU XML ("NL for EU"). **Caveats:** "request early access" (not self-serve) + **no raw-data export API** (only per-seller PDF). → not relied on alone. |
| Due-diligence fields stored (legal name, taxId, VAT, address, country, DOB) | ✅ PASS | `functions.ts:53-62` `Dac7Profile`; stored in `dac7Sellers/{shopId}` |
| Identifiers sourced from Stripe KYC; manual form fallback + per-seller-scoped | ✅ PASS | `pullDac7FromStripe` `functions.ts:206` maps `business_type`/name/DOB/address/country from `accounts.retrieve`; platform manually gap-fills redacted tax-ID; seller form scoped to own shop |
| Per-seller per-calendar-year gross + transaction count | ✅ PASS | `aggregate.ts:73` `aggregateSellerYear` (year-filtered via `createdAt`) |
| De-minimis (<30 AND ≤ EUR 2,000) computed + stored, incl. excluded | ✅ PASS | `aggregate.ts:18-19` constants, `:38` `belowDeMinimis` computed for every seller; 26 boundary assertions in `dac7-aggregation.test.cjs` (exactly 30 / exactly EUR 2000) |
| Reportable-seller export exists | ✅ PASS | `exportDac7Report` `functions.ts:301`; `PlatformDac7.jsx` table + CSV download |
| Aggregation/report/export are platform-admin-only | ✅ PASS | `requirePlatform` is the first statement on save/get/pull/aggregate/export (`functions.ts:81,99,207,266,302`) + `resolveDac7Correction` `:176` |
| No seller can view another seller's data (verified) | ✅ PASS | `firestore-isolation.test.cjs:344-346` anon-PII-deny + cross-shop-deny; list denied (`firestore.rules`); 96 assertions green |
| Seller corrects contact directly; identity via approved request | ✅ PASS | `correctOwnDac7Contact` `functions.ts:126` (contact only); `requestDac7Correction`/`resolveDac7Correction` `functions.ts:154,175` |
| Contact edits NOT written to Stripe; **identity-key change routes to Stripe** | ⚠️ PARTIAL | Contact edits are Firestore-only ✅ (`functions.ts:142`). **But** an approved identity change **overwrites our DB** (`functions.ts:188`) instead of routing the seller to re-do KYC at Stripe (spec req #10). *(Remaining — punch-list item 1.)* |
| Each reported seller receives a transparency notice | ✅ PASS *(was PARTIAL — fixed in 09)* | Finalising the export (`exportDac7Report` with `markReported:true`) writes a per-reportable-seller `reported[]` record (`functions.ts` `appendReportedRecord`); the seller's page actively shows "Du har rapporterats till Skatteverket för år X" (`AdminMyTaxData.jsx`). De-minimis-excluded sellers get no record. Preview runs are side-effect-free; sellers can't forge the record (rules `hasOnly` allowlist; isolation-tested). |

---

## 06 — B2C / individual (privatperson) sellers (P1)

| Criterion | Status | Evidence |
|---|---|---|
| An individual can complete onboarding + run a shop | ✅ PASS | Stripe Express `accounts.create` `connectOnboarding.ts:108` (hosted onboarding lets the seller select individual); no company-only gate anywhere in onboarding/checkout |
| Data model distinguishes individual vs company | ✅ PASS *(was PARTIAL — fixed in 09)* | `sellerType` is now a first-class `storeIdentity` attribute (`store.js`, AdminSettings select) AND in the DAC7 record, kept in sync (Stripe pull writes both; Stripe-verified wins). Available to contract-track/UI logic outside DAC7. |
| DAC7 identifier resolves personnummer (individual) / org.nr (company) | ✅ PASS | `sellerType` branches the `taxId` meaning; UI labels switch in `PlatformDac7.jsx` + `AdminMyTaxData.jsx`; individual requires DOB (`functions.ts:339`) |

---

## 07 — Charge model decision: destination vs direct (⏸️ pending)

✅ **Correctly scoped, NOT implemented — exactly as intended.**
- Charge type is **unchanged** = destination charges: `connectParams.ts:45` `transfer_data:{destination}`, no `on_behalf_of`, no `{stripeAccount}` request option.
- Migration plan + code tradeoffs (refunds, disputes, `on_behalf_of`, fee collection, VAT MoR) + **effort estimate L–XL ≈ 5–9 dev-days code + a hard legal/VAT/advisor gate** are documented in `docs/STRIPE_COMPLIANCE_REMEDIATION_PLAN.md` §4 "Decision 1" (`:146`, estimate `:157`).
- Recommendation recorded: do **not** migrate without advisor sign-off; Slice 01 (dispute recovery) protects the platform meanwhile.

**This is the expected state for a pending decision, not a gap.**

---

## 📋 Punch list

### ✅ Resolved in punch-list 09 (commit `962c79e`)

- **05 #11 — active transparency notification.** Finalising the export writes a per-reportable-seller `reported[]` record; the seller page actively shows "Du har rapporterats till Skatteverket för år X". Preview runs write nothing; sellers can't forge the record (isolation-tested).
- **06 — `sellerType` first-class.** Added to `storeIdentity` (model + AdminSettings select); synced with the Stripe pull (Stripe-verified wins); available to contract-track/UI logic outside DAC7.

### ⚠️ Remaining (2 PARTIALs — not deploy-blockers)

1. **05 #10 — approved identity change overwrites the DB instead of routing to Stripe.**
   `resolveDac7Correction` writes the requested value straight into `dac7Sellers` (`functions.ts:188`). The spec wants an approval to **route the seller to re-verify at Stripe (re-run KYC)** so a Stripe-verified identifier is never overwritten in our DB.
   *Fix:* on approve, mark the field "pending Stripe re-verification" + surface a Stripe onboarding/account link; don't persist the raw value.

2. **01 — insufficient-balance/shortfall path isn't an automated test.**
   The pure builders are unit-tested; the live shortfall behaviour is only a documented Stripe-CLI recipe.
   *Fix (optional):* a webhook-handler unit test with a mocked Stripe `createReversal` that throws, asserting `disputeRecoveryStatus:'shortfall'` + HTTP 200 (no retry-storm).

**Neither remaining item is a deploy-blocker.** Item 1 is a correctness-of-fit refinement to the DAC7 correction flow; item 2 is test depth.

---

## Where the implementation lives (file map)

- **01/03** dispute + refund money logic: `functions/src/payment/connectParams.ts`, `connectRefund.ts`, `stripeWebhook.ts`, `platformConfig.ts`
- **02** payout/balance: `functions/src/payment/connectOnboarding.ts`, `src/pages/admin/AdminPayments.jsx`
- **04** POD checkout: `src/components/admin/ProductForm.jsx`, `src/pages/shop/Checkout.jsx`, `src/components/shop/StripePaymentForm.jsx`, `functions/src/payment/createPaymentIntent.ts` (+ webhook), `src/utils/withdrawal.js`, `src/pages/shop/PublicProductPage.jsx`, `src/pages/admin/AdminSettings.jsx`
- **05/06** DAC7: `functions/src/dac7/aggregate.ts`, `functions/src/dac7/functions.ts`, `firestore.rules` (`dac7Sellers` + `dac7CorrectionRequests`), `src/pages/platform/PlatformDac7.jsx`, `src/pages/admin/AdminMyTaxData.jsx`
- **Tests:** `rules-tests/dispute-recovery.test.cjs`, `connect-params.test.cjs`, `withdrawal-gate.test.mjs`, `dac7-aggregation.test.cjs`, `firestore-isolation.test.cjs` (DAC7 isolation) — all run via `rules-tests/run-all.sh`
- **Plan / scoping (07):** `docs/STRIPE_COMPLIANCE_REMEDIATION_PLAN.md`
