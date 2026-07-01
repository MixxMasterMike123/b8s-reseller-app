# Stripe Connect — implementation review bundle (for legal review)

**Repo:** b8shield_portal (React/Vite client + Firebase Cloud Functions in `functions/src`)
**Generated:** 2026-06-25 · **Branch:** salvage/cleanup-and-security
**Scope:** every code path that touches Stripe or seller/order data, extracted and consolidated.
**Method:** quotes are verbatim from the cited file:line. Secrets replaced with `<REDACTED>`.
**Important:** this describes what the code ACTUALLY does, not the intended design. Where intent and code differ, it is stated explicitly.

---

## ⚠️ BOTTOM LINE (read first)

- **Charge type: DESTINATION CHARGES** (`transfer_data.destination` + `application_fee_amount`, NO `on_behalf_of`). NOT direct charges, NOT separate charges & transfers.
- **Do funds transit the platform balance? Partially — by design of a destination charge.** The card is charged ON the platform's Stripe account (platform is the settlement account / merchant of record toward the cardholder). Stripe then automatically routes the principal to the connected (shop owner's) account and the platform keeps only `application_fee_amount`. The platform does NOT custody the shop's share on its *Firestore/own* ledger and does not manually pay it out — but the charge does settle on the platform Stripe account first, and Stripe performs the transfer. (A pure "never touches our account" model would be DIRECT charges, which this is not.)
- **🚩 INTENT vs CODE GAP — the THREE-WAY split is NOT implemented.** The stated intention (split each purchase three ways: print shop + platform + shop owner) does NOT exist in code. The implementation is a **TWO-party** destination charge: platform fee + shop owner. There is **no print-shop account, no second transfer, no `transfers.create`** anywhere. The 3-way split was planned (see project notes) but is not built. Any legal conclusion that assumes three recipients per charge is currently incorrect against the code.
- **Connected accounts: Stripe EXPRESS** (`type: 'express'`), onboarded via Stripe-hosted Account Links. Stripe collects KYC; the platform does not.
- **Payouts: Stripe default automatic** (no payout code; the platform does not trigger or hold payouts).
- **Tax reporting (Stripe Tax / DAC7 / 1099): NOT configured anywhere.**

---

## 1. CHARGE TYPE

**DESTINATION CHARGE.** The PaymentIntent is created on the platform account with `transfer_data.destination` (the shop's connected account) and `application_fee_amount` (the platform's cut). There is NO `on_behalf_of` and NO `{ stripeAccount }` request-option (that would be a direct charge). A shop without a usable connected account falls back to a plain single-account charge (no Connect params).

**The decision logic — `functions/src/payment/connectParams.ts` L32-54** (pure builder, no Stripe call):
```ts
export function buildConnectChargeParams(pay, amountOre, platformDefaultBps): ConnectChargeBuild {
  const useConnect = pay?.chargesEnabled === true && !!pay?.stripeAccountId;
  if (!useConnect) return { params: {}, meta: {}, useConnect: false };
  const bps = resolveCommissionBps(pay.commissionBps, platformDefaultBps);
  const feeOre = computeApplicationFeeOre(amountOre, bps);
  return {
    useConnect: true,
    params: {
      transfer_data: { destination: pay.stripeAccountId },   // ← DESTINATION CHARGE
      application_fee_amount: feeOre,                          // ← platform cut
    },
    meta: { connectedAccountId: pay.stripeAccountId, applicationFeeAmount: String(feeOre), commissionBps: String(bps) },
  };
}
```

**The actual charge — `functions/src/payment/createPaymentIntent.ts` L360-462** (params spread in at the end):
```ts
paymentIntent = await stripe.paymentIntents.create({
  amount: amountInOre,
  currency: currency.toLowerCase(),
  automatic_payment_methods: { enabled: true },
  metadata: { /* …order-recovery metadata…  */ ...connectMeta },   // L455
  receipt_email: customerInfo.email,                                // L457
  description: `${commerceConfig.shopName} Order - …`,              // L458
  ...connectParams                                                  // L461  ← { transfer_data, application_fee_amount } or {}
});
```
- `...connectParams` (L461) is `{ transfer_data:{destination}, application_fee_amount }` for a Connect shop, or `{}` (legacy single-account charge) otherwise.
- **No `on_behalf_of`** anywhere (deliberate — keeps the platform as VAT merchant of record; see L337 comment and the connect-params test asserting its absence).
- **No `{ stripeAccount }` request option** → not a direct charge.

---

## 2. FUND CUSTODY — one purchase, end to end

1. **Client** (`src/components/shop/StripePaymentForm.jsx` L245-311) POSTs cart/customer/totals to the `createPaymentIntentV2` Cloud Function. The client sends amounts but the **server recomputes** prices/totals (it does not trust client amounts).
2. **Server** (`createPaymentIntent.ts`) reads `shops/{id}.payments`; if `chargesEnabled && stripeAccountId`, builds destination-charge params (L339-355) and creates the PaymentIntent on the **platform Stripe account** (L360-462). The card is charged on the platform account.
3. **Client confirms** the payment (`StripePaymentForm.jsx` L54-61, `stripe.confirmPayment`).
4. **Stripe** settles the charge on the **platform account**, then automatically performs the transfer of `(amount − application_fee_amount)` to the **shop's connected account** (this is the destination-charge mechanism — one atomic Stripe operation, no separate `transfers.create` in our code).
5. **Webhook** (`stripeWebhook.ts` L100-309) on `payment_intent.succeeded` writes the order to Firestore `orders/{paymentIntentId}` (idempotent: doc id = PI id), recording `connect.{connectedAccountId, applicationFeeAmount, applicationFeeId, transferId, commissionBps}` for reconciliation.

**Custody answer:** the charge SETTLES on the platform Stripe account (so the platform is the settlement/MoR account toward the cardholder), and Stripe — not our code — moves the principal to the shop's connected account as part of the same charge. The platform never holds the shop's share on its own (Firestore) ledger and never manually pays it out. This is the standard destination-charge custody profile. It is NOT the "funds never touch our account" profile of a direct charge.

---

## 3. MERCHANT OF RECORD (settlement account toward the cardholder)

**The PLATFORM account.** Because this is a destination charge created on the platform account with NO `on_behalf_of`, the platform is the settlement account / merchant of record toward the cardholder for every Connect order. (Comment at `createPaymentIntent.ts` L337-338: "NO on_behalf_of → platform stays VAT merchant of record.") For a legacy (non-Connect) shop, the charge is also on the platform account — same MoR.

---

## 4. THE THREE-WAY SPLIT

**🚩 NOT a three-way split in code — it is TWO-party.** Implemented recipients per charge:
- **(a) Print shop's share — NOT IMPLEMENTED.** No print-shop Stripe account, no transfer to one, no `transfers.create`, no second `transfer_data`. Searched the whole tree: absent. (Product notes describe a planned move to *Separate Charges + Transfers* with a printshop + tenant account, but no such code exists.)
- **(b) Platform fee — IMPLEMENTED** as `application_fee_amount` on the destination charge. Math in `functions/src/payment/connectFee.ts` L20-26:
  ```ts
  export function computeApplicationFeeOre(amountOre, bps) {
    if (!Number.isFinite(amountOre) || amountOre <= 0) return 0;
    const safeBps = Number.isFinite(bps) ? Math.max(0, Math.min(10000, Math.floor(bps))) : 0;
    const fee = Math.floor((amountOre * safeBps) / 10000);   // basis points of the GROSS amount
    return Math.max(0, Math.min(fee, amountOre));
  }
  ```
  Fee is a percentage (basis points) of the **gross** charge (incl. VAT). Rate resolution (`connectFee.ts` L35-43): `shops/{id}.payments.commissionBps` → else `settings/platform.defaultCommissionBps` → else env `PLATFORM_DEFAULT_COMMISSION_BPS` (default `500` = 5.00%, `functions/src/config/app-urls.ts` L70-76).
- **(c) Shop owner's share — IMPLEMENTED** as the destination-charge remainder: `transfer_data.destination = shops/{id}.payments.stripeAccountId` receives `amount − application_fee_amount`. From the platform balance, via Stripe's automatic destination transfer (not an explicit `transfers.create`).

**So per charge there are exactly two parties: platform (fee) and shop owner (remainder).** The printer is not in the money flow at all.

---

## 5. CONNECTED ACCOUNT TYPE

**Stripe EXPRESS.** `functions/src/payment/connectOnboarding.ts` L107-117:
```ts
const account = await stripe.accounts.create({
  type: 'express',
  country: 'SE',
  default_currency: 'sek',
  email: ownerEmail,
  capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
  metadata: { shopId },
});
```
One account per shop owner. (There is no second account type for a print shop — consistent with §4: no printer in the flow.)

---

## 6. ONBOARDING / KYC

**Stripe-hosted onboarding via Account Links.** `connectOnboarding.ts`:
- Create account + onboarding link — L107-138 (`accounts.create` then `accountLinks.create({ type: 'account_onboarding' })`).
- Resume an expired link — L144-157 (`createConnectAccountLink`).
- Status is re-polled from Stripe (return to `return_url` is NOT treated as completion) — L163-181 `refreshConnectStatus` (`accounts.retrieve` → persist `chargesEnabled/payoutsEnabled/detailsSubmitted/requirementsDue/connectStatus`).
- Express dashboard login link — L186-195 (`accounts.createLoginLink`).
- `account.updated` webhook keeps `shops/{id}.payments` status in sync — `stripeWebhook.ts` L352-369.

**KYC:** collected by **Stripe** during hosted Express onboarding (identity, bank, tax/ID). The platform does NOT collect or store the owner's identity documents, personnummer, or bank details — see §7.

---

## 7. SELLER / SHOP-OWNER DATA WE STORE (for DAC7 assessment)

The platform stores **minimal** seller data, and **no statutory tax-ID / personnummer**. By collection:

**`shops/{shopId}` (created at provisioning — `src/components/platform/ProvisionShopModal.jsx` L68-79):**
```
name, storeIdentity{shopName, accent}, status, features, ownerUid (null at provision), createdAt, provisionedVia
```
**`shops/{shopId}.storeIdentity` (shop-admin editable — `src/pages/admin/AdminSettings.jsx`):** `legalName` (juridiskt företagsnamn), `orgNumber` (organisationsnummer), `businessInfo`, `address`, `supportEmail`, `companyDescription`. (These are free-text footer/identity fields the shop fills in; not verified, not used for Stripe KYC.)
**`shops/{shopId}.payments` (Stripe status mirror — written by onboarding + the `account.updated` webhook):** `stripeAccountId` (acct_…), `chargesEnabled`, `payoutsEnabled`, `detailsSubmitted`, `requirementsDue[]`, `connectStatus`, `commissionBps`, `connectEnabled`, `onboardingStartedAt/CompletedAt`, `lastSyncedAt`. **No bank account, no tax ID, no personnummer.**
**`users/{uid}` (admin/owner login):** `role`, `shopId`, `platform`, `email`, `active`. (Identity of the human operator is just an email + role.)

**DAC7-relevant gaps (stated plainly):** the platform does NOT persist seller tax identifier (personnummer / VAT-nr beyond the free-text `orgNumber` field), DOB, or verified legal name/address. Those live with Stripe (Express KYC). There is **no DAC7 field set, no per-seller gross/transaction aggregation, no reporting export** in the code (see §10).

---

## 8. DISPUTES & NEGATIVES

- **Refunds** — `functions/src/payment/connectRefund.ts` L58-78 calls `stripe.refunds.create(params)` where, for a destination-charge order, `params` includes `reverse_transfer: true` + `refund_application_fee: true` (`connectParams.ts` L70-73). This claws the principal back FROM the shop's connected account AND returns the platform fee — so a refund is not eaten by the platform. A legacy order takes a plain refund. Double-refund guard at L50-51.
- **Disputes/chargebacks** — `stripeWebhook.ts` L371-395 stamps `charge.dispute.created` onto the order (`disputeStatus/disputedAt/disputeId`). **It only records; it does not move money.** Because the charge settled on the PLATFORM account (destination charge, platform = MoR), **Stripe debits the PLATFORM balance for a dispute/chargeback** by default. The code contains NO automatic reversal of the connected-account transfer on dispute — so on a lost dispute the platform currently bears the loss unless reconciled manually. ⚠️ Flag for legal: with destination charges, dispute/chargeback liability sits on the platform account by default.
- **Negative balances** — no explicit handling in code.

---

## 9. PAYOUTS

**Stripe default automatic.** There is NO `stripe.payouts.create`, no `settings.payouts.schedule`, no `'manual'`/`'automatic'` config anywhere. Connected (Express) accounts pay out on Stripe's default schedule; the platform neither triggers nor holds payouts. (Note: a compliant "platform controls timing" model would set payouts to `manual` + trigger them — that is NOT done here; payouts are entirely Stripe-managed.)

---

## 10. TAX REPORTING

**NOT configured.** No `stripe.tax`, `automatic_tax`, `tax_behavior`, Stripe "platform tax reporting" / Connect tax-form (1099) feature, or any DAC7-specific code/field exists. VAT is computed by our own server into the order total (`createPaymentIntent.ts` totals; metadata `vat`), but there is no tax-reporting integration or seller tax-data aggregation.

---

## SDK INIT + SECRET SOURCES (names only; never values)

- **Backend Stripe SDK:** `new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })` — `createPaymentIntent.ts` L235-236, `stripeWebhook.ts` L68, `connectOnboarding.ts` L40, `connectRefund.ts` L58. Secret declared via Firebase Functions secrets: `secrets: ['STRIPE_SECRET_KEY']` (and `'STRIPE_WEBHOOK_SECRET'` for the webhook).
- **Webhook signature:** `stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)` — `stripeWebhook.ts` L82-86.
- **Client publishable key:** `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` — `src/utils/stripeClient.js` (publishable by design).
- No OAuth client secret (onboarding is Account Links, not OAuth). No secret values are logged in the cited code.

---

## IMPLEMENTED vs PLANNED/ABSENT (summary)

| Capability | Status | Evidence |
|---|---|---|
| Destination charges (platform fee + shop owner) | ✅ IMPLEMENTED | createPaymentIntent.ts L360-462, connectParams.ts L32-54 |
| `application_fee_amount` (platform cut, bps of gross) | ✅ IMPLEMENTED | connectFee.ts L20-43 |
| Express account onboarding (Account Links) | ✅ IMPLEMENTED | connectOnboarding.ts L107-195 |
| Connect-aware refunds (reverse_transfer + refund_application_fee) | ✅ IMPLEMENTED | connectRefund.ts + connectParams.ts L64-75 |
| Dispute stamping (record only) | ✅ IMPLEMENTED | stripeWebhook.ts L371-395 |
| **Three-way split (printer + platform + owner)** | ❌ NOT IMPLEMENTED | no printshop account / no transfers.create anywhere |
| Separate charges & transfers | ❌ NOT IMPLEMENTED | — |
| Manual/platform-controlled payouts | ❌ NOT IMPLEMENTED | no payout code (Stripe automatic) |
| Stripe Tax / DAC7 / 1099 reporting | ❌ NOT IMPLEMENTED | — |
| Seller tax-ID / personnummer / DOB storage | ❌ NOT STORED | only free-text orgNumber; KYC at Stripe |

## Files in this bundle
- `STRIPE_ARCHITECTURE.md` (this file)
- `code/createPaymentIntent.charge.ts` — the PaymentIntent create + Connect param resolution
- `code/connectParams.ts` — pure charge/refund param builders (the money-path decision logic)
- `code/connectFee.ts` — fee/commission math
- `code/connectOnboarding.account.ts` — Express account creation + onboarding links
- `code/stripeWebhook.handlers.ts` — webhook verify + order create + dispute/account.updated
- `code/connectRefund.ts` — refund handler
- `code/client.StripePaymentForm.jsx` — client charge call + confirm
- `code/client.AdminPayments.jsx` — onboarding UI calls
- `code/seller-data.md` — exact seller/shop fields persisted (provisioning + settings + payments mirror)
