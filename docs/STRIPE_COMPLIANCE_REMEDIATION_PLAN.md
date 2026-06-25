# Stripe Connect — Compliance & Financial-Exposure Remediation Plan

**Branch:** `feat/stripe-compliance` (off `salvage/cleanup-and-security`)
**Status:** ✅ ALL SLICES BUILT + COMMITTED + PUSHED. ⛔ NOT DEPLOYED (awaiting explicit go; Slice E firestore.rules = hard STOP-and-surface).
**Scope:** turn the Stripe-review gaps into a buildable plan; implement A–F; scope (don't build) decisions 1 & 2.
**Ground truth:** verified against HEAD at start (46d16b4), every cited file read; adversarial-verified per slice; isolation gate green (96 firestore-isolation assertions).

## ✅ What shipped (commits)
- **Slice C** (`643c0bb`) — platform-fee-on-refund flag + shared platformConfig reader (= decision 2).
- **Slice A** (`9339cd1`) — dispute/chargeback recovery (reverse-on-created + dispute.closed + idempotency keys + negative-balance alert). **Money-correctness fix: reversal uses refund_application_fee=false.**
- **Slice B** (`0ebfc8e`) — per-account payout-delay (platform-only) + connected-account balance surface.
- **Slice D** (`3e3ef39`) — POD/right-of-withdrawal checkout gate (server-authoritative) + size guide + order proof.
- **Slice E/F** (`1dfa834`) — DAC7 platform-owned seller data + pull-from-Stripe + aggregation + export + seller GDPR rights (view/rectify-contact/request-identity-correction).

## ⛔ Deploy gating (needs explicit go)
- **hosting + functions:** Slices A/B/D/E/F all add functions + client. Deploy `firebase deploy --only functions,hosting`.
- **firestore.rules (STOP-and-surface):** Slice E adds `dac7Sellers` + `dac7CorrectionRequests` (PII isolation). Deploy `--only firestore:rules` ONLY with explicit go; gate is green.
- **firestore.indexes:** Slice E aggregation queries `orders where shopId==X` (existing index) — verify no new composite needed at deploy.
- **No secrets touched.** `settings/platform` flags (`refundApplicationFee`, `reverseDisputeOnCreated`) default to current behaviour; set them only when you decide.

## ⚠️ Open decisions flagged (don't block deploy, want your call)
- **Affiliate commission on a chargeback** (Slice A §4c) — not reversed today; recommend yes via a dispute-lost signal.
- **DAC7 SEK→EUR rate source** — currently a documented placeholder (0.087); wire a live rate before filing.
- **Stripe DAC7 early access** — request it if you want Stripe's XML generation on top of our export.
- **Buyer-type branch** (Slice D) — corporate=lighter withdrawal text is a documented seam (parked POD plan).

---

## 0. Locked decisions (from this session)

| # | Decision | Choice |
|---|---|---|
| A | Dispute timing | **Reverse-on-created** (config-flagged; re-transfer on won) |
| D | POD product flag | **New per-product `isPersonalized` boolean** in ProductForm |
| E | DAC7 data source | **Both** — own DAC7 fields + pull/validate from Stripe Express KYC; build aggregation + export regardless |
| Proc | Process | Plan-first → approve → implement all on a branch with tests + 4-way cross-check |
| C / dec.2 | Fee-on-refund | Config flag, **default = current behavior (refund the fee)** |

**🔁 MANDATORY FINAL GATE on every slice (Mikael's hard rule):**
`shop ↔ admin ↔ platform ↔ B2B admin/portal` — the LAST check before any commit. For every field/control/behavior touched, verify all four surfaces stay in sync so functionality is never added to one section and missed in another. Run ALL directions, not one.

---

## 1. Current state (verified facts the plan builds on)

- **Charge model:** DESTINATION CHARGE. `transfer_data.destination` + `application_fee_amount`, **no** `on_behalf_of`, **no** `{stripeAccount}`. Platform = settlement/MoR. (`connectParams.ts:32-54`, `createPaymentIntent.ts:332-461`.)
- **Order `connect` map** is stamped by the webhook (`stripeWebhook.ts:274-284`): `isDestinationCharge, connectedAccountId, applicationFeeAmount, applicationFeeId, transferId, commissionBps, transferReversed:false`. → **The `transferId` I need for a reversal is already persisted.**
- **Disputes:** `charge.dispute.created` only *stamps* `disputeStatus/disputedAt/disputeId` (`stripeWebhook.ts:371-395`). **No money movement. No `dispute.closed` handler at all.** Platform balance is debited and never recovered.
- **Refunds:** `refundOrder` callable + `buildRefundParams` (`connectRefund.ts`, `connectParams.ts:64-75`): Connect order → `reverse_transfer:true` + `refund_application_fee:true`. **The fee-refund is hardcoded `true`.**
- **Config seam:** `settings/platform` doc (read in `createPaymentIntent.ts:345-347`), currently holds only `defaultCommissionBps`. **This is where new platform flags go.** Env fallback `PLATFORM_DEFAULT_COMMISSION_BPS` (`app-urls.ts:70-76`).
- **Test pattern:** pure builders in `connectParams.ts` (no I/O) → plain `.cjs` test (`rules-tests/connect-params.test.cjs`) requiring `functions/lib/`. Isolation tests in `rules-tests/firestore-isolation.test.cjs` via `@firebase/rules-unit-testing`. **No `npm test` in functions/** — tests run as `node rules-tests/<x>.test.cjs`.
- **Onboarding:** Express, `country:'SE'`, `accounts.create` in `connectOnboarding.ts:107-117`. `account.updated` webhook syncs `payments.*`. No `individual` vs `company` concept anywhere.
- **Seller data stored:** `shops/{id}.storeIdentity` (free-text `legalName`, `orgNumber`, `address`, …) + `shops/{id}.payments` (Stripe status mirror). **No tax-ID/personnummer/DOB/verified address. No per-seller aggregation. No DAC7 export.**
- **Products:** v2 model (`ProductForm.jsx`). Variants `[{sku,label,price,image?}]` exist (label carries size/colour). **No personalization / upload / made-to-order field.** No size-guide field.
- **Checkout:** `Checkout.jsx` steps contact→shipping→payment. Terms are an **informational link only** (no required checkbox). Order created **server-side by the webhook** from PI metadata — so any checkout-captured proof must ride through PI metadata.
- **Per-shop config:** `shops/{id}.storeIdentity` via `loadShopConfig`/`saveShopConfig` (`shopConfig.js`). Admin edits in `AdminSettings.jsx`.
- **Platform UI:** `src/pages/platform/PlatformShops.jsx` (fleet), `PlatformAddons.jsx` (features), `ProvisionShopModal.jsx`. No seller-data/DAC7 surface yet.
- **Isolation invariants that MUST NOT regress** (`tenant_isolation_audit.md`): every new collection shopId-stamped + `isAdminOfShop`/`isPlatform` rules; functions derive shopId from the RESOURCE not the request; isolation gate green before committing any rules/query change.

---

## 2. Cross-cutting building blocks (built once, used by several tasks)

### BB1 — Platform config reader (`functions/src/payment/platformConfig.ts`, NEW, pure-ish)
A single typed reader for `settings/platform` with env fallbacks and safe defaults. Returns:
```ts
{
  defaultCommissionBps: number,          // existing
  refundApplicationFee: boolean,         // task C / decision 2 — default TRUE
  reverseDisputeOnCreated: boolean,      // task A — default TRUE
}
```
- Keeps the I/O in one place; the pure builders stay pure and unit-testable.
- `createPaymentIntent.ts` migrates its inline `settings/platform` read to this reader (behaviour identical; verified by the existing connect-params test staying green).

### BB2 — Dispute/transfer param builders (`connectParams.ts`, extend — PURE, unit-tested)
Add pure builders so the money decisions are testable without Stripe:
- `buildDisputeReversalParams(order)` → `{ transfer: order.connect.transferId, amount?, refund_application_fee? }` or `null` when not a Connect order / no transferId.
- `buildDisputeReTransferParams(order)` → params to re-transfer a previously-reversed amount on a won dispute, or `null`.
- `buildRefundParams` gains a `refundApplicationFee: boolean` arg (default true) instead of the hardcoded literal (task C). **Default preserves today's behaviour** → existing tests stay green.

---

## 3. Slices (each = build → unit/isolation test → adversarial verify → **4-way cross-check** → commit+push)

### Slice C — Platform-fee-on-refund config flag (SMALL, do first; unblocks the pattern)
**Why first:** smallest, establishes BB1 + the `connectParams` arg threading the other slices reuse.
- BB1 `platformConfig.ts` + migrate the existing commission read.
- `buildRefundParams(order, amountSek, refundApplicationFee=true)` — param, not literal.
- `connectRefund.ts` reads `refundApplicationFee` from BB1, passes it in.
- **Decision-2 mapping:** flag `settings/platform.refundApplicationFee`, default `true` (= current). Flip to `false` later to keep the platform fee as a non-refundable service fee.
- **Tests:** extend `connect-params.test.cjs` — fee-refunded vs fee-retained, legacy unaffected, default = today.
- **Files:** `platformConfig.ts`(new), `connectParams.ts`, `connectRefund.ts`, `createPaymentIntent.ts`(read migration), test.
- **4-way:** flag is platform-only (no shop/admin/B2B surface) — document that explicitly; confirm B2B (cancelB2BOrder) path is untouched (it doesn't refund cards).

### Slice A — Dispute / chargeback recovery (P0)
- **`charge.dispute.created`** (extend `stripeWebhook.ts`): if Connect order && `reverseDisputeOnCreated` (BB1, default true) && `transferId` present → `stripe.transfers.createReversal(transferId, {amount, ...})`. Persist `connect.disputeReversalId`, `connect.disputeReversedAmount`, `connect.transferReversed=true`, `disputeStatus`, `disputedAt`, `disputeId`. Idempotent (skip if `transferReversed` already true). Wrap in try/catch — **negative-balance / already-reversed must log + stamp, never crash the webhook** (return 200 so Stripe doesn't retry-storm).
- **`charge.dispute.closed`** (NEW handler): `won` → re-transfer the reversed amount back to the connected account (`stripe.transfers.create({destination, amount, ...})`), stamp `disputeStatus:'won'`, `connect.disputeReTransferId`. `lost` → finalize: stamp `disputeStatus:'lost'`, reconcile note (money already recovered on `created`). Idempotent.
- **Negative-balance detection:** after a reversal, if Stripe signals the connected account can't cover it (SE accounts do NOT auto-debit the seller's bank), catch the error, stamp `connect.disputeRecoveryStatus:'shortfall'` + log a structured alert. Surface in admin (Slice B). **Documented config flag** `reverseDisputeOnCreated` (BB1) for reverse-on-created vs wait-for-outcome.
- **Tests:** new `rules-tests/dispute-recovery.test.cjs` over the pure builders (BB2): Connect dispute → reversal params w/ correct transfer+amount; legacy → null (no reversal); won → re-transfer params; missing transferId → null (no crash); fee-retain interaction. Plus a documented manual Stripe-CLI test recipe (`stripe trigger charge.dispute.created`) since live Stripe calls aren't unit-testable.
- **Files:** `stripeWebhook.ts`, `connectParams.ts`(BB2), `platformConfig.ts`(BB1), test.
- **⚠️ Flag:** the webhook's TS interface types `data.object` as `PaymentIntent`; dispute events carry a `Stripe.Dispute`. I'll type the dispute branches correctly (narrow per event type) — call out in the diff.
- **4-way:** dispute recovery is server + platform-visible (admin sees disputeStatus on the order). Confirm: admin OrderDetail RENDERS the new dispute fields; platform fleet can see disputed orders; B2B Faktura orders are `payment.method:'invoice'` (no Stripe charge) → **must be excluded** from dispute logic (no transferId) — verify the guard.

### Slice B — Negative-balance / payout-risk controls (P1)
- **Per-account payout delay / reserve (targeted, NOT blanket):** new platform-only callable `setConnectPayoutDelay({shopId, delayDays})` → `stripe.accounts.update(acct, {settings:{payouts:{schedule:{delay_days}}}})`. Optionally `setConnectReserve` if we use Stripe's reserve API (flag as advisor-gated if the API shape is uncertain). Persist the chosen delay on `shops/{id}.payments.payoutDelayDays` for display.
- **Per-account balance surface:** new platform/admin-readable callable `getConnectBalance({shopId})` → `stripe.balance.retrieve({stripeAccount: acct})`; return available/pending + **negative-balance flag**. Show in `AdminPayments.jsx` (and/or a platform fleet column).
- **AdminPayments UI:** add a "Saldo & utbetalningsrisk" section — balance, negative warning, and (platform-only) the payout-delay control. Shop-admin sees balance read-only; platform sets delay.
- **Tests:** callable auth/guard via the functions-isolation harness pattern (platform-only for delay; `requireAdminOfShop` for balance read). Pure param-builder for the delay payload if non-trivial.
- **Files:** `connectOnboarding.ts` or new `connectRisk.ts`, `index.ts`(exports), `AdminPayments.jsx`, maybe `PlatformShops.jsx`(column), test.
- **4-way:** platform sets delay → admin REFLECTS it (read-only) → shop owner sees their balance/risk; confirm B2B unaffected (no connected-account payouts in Faktura flow).

### Slice D — POD / right-of-withdrawal checkout (P1, consumer law)
- **Product flag:** add `isPersonalized` (boolean, default false) to `ProductForm.jsx` (+ a `madeToOrderNotice` optional override text; neutral default from config). Round-trips in `formFromProduct`. Conditional-spread so non-POD products never gain noise.
- **Size guide:** add a `sizeGuide` field/component (per-product rich text or structured table) in ProductForm; render on the product page + link it from the no-withdrawal notice. Neutral fallback when empty.
- **Checkout gate (`Checkout.jsx` payment step):** if ANY cart item `isPersonalized` → render the "made to order — no right of withdrawal" notice + a **required checkbox** that blocks payment until checked. Standard-options cart → **no notice**, normal 14-day path (a short "you have 14-day withdrawal" line, no blocking checkbox).
- **Proof persistence:** the order is webhook-created, so pass through PI metadata: `withdrawalConsent: true`, `withdrawalNoticeVersion`, `withdrawalNoticeTextHash` (or short id), `withdrawalConsentAt`. Webhook stamps `order.withdrawal = {consent, noticeVersion, acceptedAt, ...}`. (Server backstop = record-what-arrived, per the parked POD plan's locked decision.)
- **Per-shop legal config:** the notice text + version live in `shops/{id}.storeIdentity` (e.g. `legal.noWithdrawalNotice`, `legal.withdrawalNoticeVersion`) with a neutral platform default — admin-editable in `AdminSettings.jsx`. Versioned so the persisted proof references the exact text shown.
- **⚠️ Buyer-type branch (from `pod_compliance_checkout.md`):** the parked plan wants individual=full gate / corporate=lighter text. **This task (D) is product-personalization-driven, not buyer-type-driven.** I'll build the personalization gate now and leave a clearly-marked seam (`buyerType`) where the buyer-type branch plugs in later — NOT pre-decide buyer-type detection. Flag this as the intentional boundary with the parked work.
- **Tests:** pure helper `requiresWithdrawalGate(cartItems)` unit-tested (any personalized → true; all standard → false; empty → false). Checkout interaction is manual/QA (browse).
- **Files:** `ProductForm.jsx`, product page component, `Checkout.jsx`, `StripePaymentForm.jsx`(consent → metadata), `createPaymentIntent.ts`(accept+forward metadata), `stripeWebhook.ts`(stamp proof), `AdminSettings.jsx`(legal config), a new `withdrawal.js` helper, store defaults, test.
- **4-way:** admin sets `isPersonalized` + size guide + notice text → shop checkout READS + RENDERS + GATES on them → proof flows back to the order admin can see → **B2B:** decide + document whether the Faktura/B2B checkout shows any withdrawal text (corporate buyer = no ångerrätt; task says ignore B2B checkout — I'll ensure I don't break B2B and leave the corporate branch as the documented seam).

### Slice E — DAC7 seller data + aggregation + export (P0, legal)
- **Stripe feature eval (deliverable, first):** report whether Stripe Connect "platform tax reporting" (DAC7) can be enabled for this account + what it collects/exports. Written into this doc's §6. (No secret access; I evaluate from Stripe's documented API surface + what `accounts.retrieve` exposes — flag anything that needs the live dashboard.)
- **Data model:** extend seller identity with the DAC7 field set, branching **individual vs company** (task F): legal name, tax ID (`personnummer` for individuals / `orgNumber` for companies), VAT number where applicable, address, country of residence, DOB (individuals). Decision E = **both**: store our own fields AND populate/validate from Stripe Express KYC where `accounts.retrieve` exposes verified values. Live in a dedicated `shops/{id}.sellerProfile` map (kept distinct from free-text `storeIdentity`) OR a `dac7Sellers/{shopId}` doc — **recommend `sellerProfile` on the shop doc** (one source, already isolation-ruled). Flag the choice for review.
- **Onboarding/admin capture:** a form (admin + platform) to enter/confirm the DAC7 fields; pull-from-Stripe button where available. Sensitive fields (personnummer/DOB) → tight rules (platform + own-shop-admin only; never public).
- **Aggregation:** per-seller per-calendar-year rollup: gross consideration (sum of `order.total` for that shop/year) + transaction count. **De-minimis test computed but not used to suppress:** `<30 sales AND ≤ EUR 2,000 → excluded` (flagged, still computed). Built as either an on-write incremental counter (`FieldValue.increment`, mirroring the affiliate-stats pattern) on a `sellerYearlyTotals/{shopId_year}` doc, OR an on-demand aggregation query over `orders where shopId==X && createdAt in [year]`. **Recommend on-demand query for v1** (no migration/backfill risk; exact; orders already shopId-stamped + createdAt). Flag: currency — orders are SEK; DAC7 threshold is EUR → store SEK, convert at report time with a documented rate source (advisor/manual).
- **Export:** platform surface listing reportable sellers with the DAC7 fields + yearly aggregate, exportable (CSV/JSON). Skatteverket registration is a separate manual step (noted, not built). Optionally wire Stripe's DAC7 export if the feature eval says it's available.
- **Tests:** pure aggregation helper (`aggregateSellerYear(orders, year)` → {gross, count, deMinimisExcluded}) unit-tested with fixtures (boundary cases: exactly 30 sales, exactly EUR 2,000, mixed years, refunded orders excluded?). New rules-isolation tests for `sellerProfile`/`dac7Sellers` (platform + own-shop-admin only; cross-shop denied; no public read of tax-ID).
- **Files:** new `functions/src/dac7/` (aggregation + export callable), `firestore.rules`(new sensitive block — **STOP-and-surface before deploy**), `firestore.indexes.json`(orders by shopId+createdAt if needed), a platform DAC7 page (`src/pages/platform/PlatformDac7.jsx`), seller-profile admin form, tests.
- **⚠️ STOP-and-surface:** any `firestore.rules` change ships only with explicit go + isolation gate green (working-method).
- **4-way:** seller fills DAC7 in admin (or platform enters) → platform DAC7 export READS it → aggregation reads shop orders → **B2B:** decide whether B2B Faktura orders (`source:'b2b'`) count toward gross consideration (likely YES — they're sales by the seller; flag for confirmation). Confirm consumer storefront NEVER exposes tax-ID.

### Slice F — Individual (privatperson) sellers (P1)
- Largely folded into E's individual/company branch. Ensure onboarding + identity model support an INDIVIDUAL seller (Stripe Express already does). Add `sellerType: 'individual' | 'company'` on the shop/sellerProfile; branch DAC7 fields (personnummer+DOB vs orgNumber+VAT). Provisioning + AdminSettings reflect the type.
- **Stripe:** `accounts.create` already `type:'express'`; individual vs company is a KYC distinction Stripe handles — confirm our `business_type` handling (we don't set it today → Stripe asks during onboarding; we read it back). Flag if we should pre-set `business_type`.
- **Tests:** branch coverage in E's helper tests (individual fixture vs company fixture).
- **Files:** `sellerProfile` model, `ProvisionShopModal.jsx`/`AdminSettings.jsx`(type selector), DAC7 helpers.
- **4-way:** platform/admin sets seller type → DAC7 fields branch → export shows correct identifier → B2B unaffected.

---

## 4. Scoping deliverables (NOT built)

### Decision 1 — Destination → Direct charges migration (scope + effort)
**What changes with DIRECT charges** (`{stripeAccount: acct}` request option, or `on_behalf_of` + transfer_data variants):
- **MoR / VAT:** shop owner becomes merchant of record toward the cardholder → VAT MoR shifts to the shop. Removes the platform-VAT-MoR posture the code deliberately keeps today (`createPaymentIntent.ts:337` "NO on_behalf_of").
- **Funds:** charge settles on the CONNECTED account, not the platform → chargeback liability + negative-balance exposure move OFF the platform balance (largely solves task A's exposure at the source — note the interaction).
- **Fee collection:** `application_fee_amount` still works on direct charges (Stripe routes the fee to the platform) — but the charge is created with `{stripeAccount}`, so the PI lives on the connected account; webhook/idempotency keying changes (events arrive as Connect events with `account`).
- **Refunds:** refund on a direct charge is issued on the connected account; `reverse_transfer` no longer applies (there's no platform→shop transfer to reverse); `refund_application_fee` still relevant. → `buildRefundParams` branch logic changes materially.
- **Disputes:** liability moves to the connected account → Slice A's reversal logic becomes mostly unnecessary for direct charges (but A still needed while we're on destination charges).
- **on_behalf_of:** a middle option (destination charge + `on_behalf_of`) shifts VAT MoR to the shop while keeping settlement on the platform — call out as a third path.

**Files touched (estimate):** `connectParams.ts` (charge + refund branches), `createPaymentIntent.ts` (charge creation + metadata + webhook keying), `stripeWebhook.ts` (Connect-event routing, `event.account`, idempotency), `connectRefund.ts`, `connectOnboarding.ts` (capabilities/MoR config), `AdminPayments.jsx` (MoR messaging), client confirm flow, all payment tests, plus **legal/contract + VAT posture** (Plattformsvillkor/Tryckeriavtal).

**Effort estimate:** **L–XL (≈ 5–9 dev-days code + a hard legal/VAT/advisor gate).** The code is tractable (~6 files + tests); the gating cost is the VAT-MoR shift + chargeback-liability reallocation + per-account negative-balance ownership + contract updates — those need the advisor + new agreements, not just code. **Recommend: do NOT migrate without the advisor sign-off; Slice A protects us in the meantime.**

### Decision 2 — Platform fee on refund
Implemented as the config flag in **Slice C** (default = current behaviour). Flipping `settings/platform.refundApplicationFee=false` keeps the platform fee on a customer refund (non-refundable service fee). **No further build needed beyond C** — this is purely a business/legal toggle once C lands.

---

## 4b. Slice A — manual Stripe test recipe (live paths not unit-testable)

The reversal/re-transfer + negative-balance handling live in the webhook and call
Stripe — unit tests pin the pure builders; the live path is verified in TEST mode:

```bash
# 1. Forward webhooks to the deployed/emulated function:
stripe listen --forward-to <FUNCTION_URL>/stripeWebhookV2
# 2. Place a TEST destination-charge order on a Connect-enabled shop (real flow),
#    so an order doc exists with connect.transferId.
# 3. Open a dispute on that charge (Stripe test card 4000000000000259 auto-disputes,
#    or trigger synthetically):
stripe trigger charge.dispute.created
#    → expect: order stamped disputeStatus + connect.transferReversed=true +
#      connect.disputeRecoveryStatus='recovered' + disputeReversedAmount set.
#      Admin → order detail shows the "Tvist / Återkrav" card.
# 4. Close the dispute won/lost:
stripe trigger charge.dispute.closed
#    won  → connect.disputeReTransferId set, status 'returned_won'.
#    lost → status 'lost_final' (and recovery happened on created or now).
```
Negative-balance/shortfall: reverse on a connected account with insufficient
balance → expect disputeRecoveryStatus='shortfall' + disputeRecoveryError, webhook
still returns 200 (no crash, no retry-storm). **Verified manually before live cutover; never claimed green off a build pass.**

## 4c. Slice A — open follow-ups (flagged, NOT auto-implemented)
- **Affiliate commission on a chargeback:** the dispute reversal claws the principal back from the shop but does NOT reverse affiliate commission (the `reverseAffiliateCommissionOnCancel` trigger only fires on `status` → `cancelled`/`refunded`). On a lost dispute the affiliate keeps commission on money that's gone. Fix touches the affiliate ledger (a different subsystem) + has order-display side-effects → deferred for an explicit decision: reverse affiliate commission on a lost/recovered dispute? (Recommend yes, via extending the trigger to a dispute-lost signal, NOT by mislabelling status='refunded'.)
- **Concurrency hardening (DONE in this slice):** both money calls now carry a Stripe `idempotencyKey` keyed on the dispute id → concurrent/duplicate webhook deliveries collapse to one Stripe operation (no double-reversal, no double re-transfer of real funds). This also fixes the patch-corruption case (a duplicate returns the original success, writing the same `recovered` patch, never a false `shortfall`).
- **`warning_closed` (DONE):** handled alongside `lost` so an early-fraud-warning close doesn't leave funds unrecovered in wait-for-outcome mode.

## 4d. Slice E/F — DAC7 model (CORRECTED per Mikael, platform-owned)

**DAC7 is the PLATFORM operator's obligation** (reporting platform operator under EU Dir. 2021/514), NOT the shop owner's. Access model is SPLIT:

**Platform-only (requirePlatform, platform console, never visible to shop owners):**
- Pull-from-Stripe (primary source), aggregation, de-minimis test, report generation, Skatteverket export.
- The AUTHORITATIVE identity fields (personnummer/org.nr/DOB) — platform sets/verifies.

**Stripe DAC7 feature eval (2026):** Stripe Connect "platform tax reporting" = the `tax_reporting` ADDITIONAL VERIFICATION on connected accounts (auto-collected during Express onboarding; Stripe validates + generates XML for "NL (for EU)"). **BUT: (a) "Request early access" — NOT self-serve, must contact Stripe; (b) NO documented raw-data export API (only per-seller PDF statements via API).** → We CANNOT rely on it alone today. **Chosen: pull what `accounts.retrieve` exposes now (business_type→sellerType, name, DOB, address, country) + keep our own platform record + aggregation + export; manual gap-fill for redacted fields (full tax-ID). Wire Stripe's PDF/report on top IF early access is granted.**

**Seller-facing (own-shop admin, OWN doc ONLY — hard rule: never another seller's data):**
- **GDPR rectification:** seller VIEWS own reported data + can directly correct CONTACT fields (address/VAT/legalName); for IDENTITY keys (personnummer/org.nr/DOB) submits a CORRECTION REQUEST the platform approves (rectification right satisfied, platform keeps report integrity).
- **DAC7 transparency:** each reported seller is notified what is reported about them.

**Rules:** `dac7Sellers/{shopId}` — platform read/write (authoritative) + own-shop-admin read-own + own-shop-admin write only the contact-field subset + a `dac7CorrectionRequests` path for identity-change requests. NO list, NO cross-shop, NO public. (Replaces the simpler platform+own-admin draft.) STOP-and-surface before deploy.

## 5. Test & verification strategy
- **Unit (pure builders):** extend `connect-params.test.cjs`; new `dispute-recovery.test.cjs`, `dac7-aggregation.test.cjs`, `withdrawal-gate.test.cjs`. Run `node rules-tests/<x>.test.cjs` (and add to `rules-tests/run-all.sh`).
- **Isolation gate:** `npm run test:isolation` / `run-all.sh` MUST stay green; any rules change (Slice E) re-runs it before commit. New `sellerProfile`/`dac7` isolation assertions added.
- **Build:** `cd functions && npm run build` (tsc) + `npm run build` (vite) green after every slice.
- **Live Stripe paths** (disputes, balances, payout delay) aren't unit-testable → documented Stripe-CLI / test-mode recipes; flagged as manual-QA, never claimed "verified" off a build pass.
- **Adversarial verifier subagent** reviews each slice's diff before commit; **4-way cross-check** is the final gate every slice.

## 6. Order of work
C → A → B → D → E/F → scoping docs finalized. (C establishes BB1/BB2; A is the P0 financial fix; B surfaces A's alerts; D is self-contained; E/F is the largest and ends with the rules STOP-and-surface.)

## 7. Guardrails
- New branch `feat/stripe-compliance`. Commit+push together. Never touch secrets/`.env`/`merchant-service-account.json`.
- Never deploy without explicit go; Slice E rules = hard STOP-and-surface.
- Flag every uncertainty (typed in the diff + here) rather than guess.
- Effort per slice (rough): C=S, A=M, B=M, D=L, E=XL, F=S(folded). Total ≈ a focused multi-day build.
