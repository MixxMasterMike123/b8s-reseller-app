# POD Salvage Spec — Repurposing B8Shield into a Turnkey Print-Shop Webshop

**Written:** 2026-05-29
**Status:** Direction approved. This is the working roadmap.
**Supersedes the framing in:** `SESSION_HANDOFF.md` (which assumed a multi-tenant marketplace and concluded "~5% salvage, fresh build"). For the architecture actually chosen, that conclusion is inverted — see below.

---

## 1. The product, in one sentence

A **single-tenant, turnkey webshop + admin + affiliate system**, deployed **one instance per print shop**, that lets an IRL print shop take Print-On-Demand orders online and fulfill them **in-house**. You are a software vendor selling/installing instances — **not** a marketplace, **not** a payment middleman.

### What this explicitly is NOT (and why that matters)
The three things that would force a ground-up rewrite **do not apply**:
- ❌ **Multi-tenant `shopId` on every record** — not needed; each shop = its own deploy + own Firebase project.
- ❌ **Stripe Connect / money-splitting** — not needed; each shop keeps its own money in its own Stripe account.
- ❌ **Print-provider integration (Printful/Printify)** — not needed; shops print in-house, so orders just land in a queue.

Removing these three is what flips the salvage math from "rebuild" to "repurpose."

---

## 2. What B8Shield actually is (the asset)

Stripped of branding, the current app is:
- A single-merchant **storefront** (cart, checkout, product pages, order confirmation, returns).
- A **22-page admin console** (products, orders, customers, settings, users, analytics).
- A complete, clean **affiliate engine** (code generation, click tracking, 30-day localStorage attribution, server-side commission recompute, payouts, analytics dashboard).
- **Stripe** payments with a solid server-side webhook (idempotent, creates order server-side).
- A substantial **email orchestrator** (order confirmations, etc.).
- Built-in **i18n / multi-currency**.

That is ~90% of "a simple but stable webshop and admin with affiliate ability." The work is **subtraction and reskinning**, not construction.

### Salvage math (for THIS architecture)
| Bucket | Share | What |
|---|---|---|
| **Reuse ~as-is** | ~60-65% | storefront, cart, checkout, Stripe payment+webhook, order processing, affiliate engine, email orchestrator, admin order/customer/settings pages, i18n |
| **Rework** | ~20-25% | de-brand, collapse B2B/B2C duality to plain B2C, parameterize VAT/currency, generalize affiliate defaults |
| **Build new** | ~15% | customer design upload, mockup/preview on product page, print-queue admin view |

---

## 3. Backend: keep / delete (`functions/`)

**Live, deployed backend = `functions/src/*.ts`** (V2 TypeScript, 44 exports via `functions/src/index.ts`). `functions/package.json` `main` = `lib/index.js` (compiled V2). This is the good code — keep it.

### DELETE (dead code — removing it is the first cleanup; it's what dragged the 3 prior migrations)
- `functions/index.js` — **3,149-line V1 god-file**, ~55% commented-out. NOT the deploy entry. Dead.
- `functions/webhook-standalone.js` — dead duplicate of the webhook (`// TODO: Add full order creation logic here`). The live path is `functions/src/payment/stripeWebhook.ts`.
- Duplicate/experimental payment fns once the canonical one is confirmed in use:
  - **Keep:** `stripeWebhookV2` (`functions/src/payment/stripeWebhook.ts`), `createPaymentIntentV2` (`createPaymentIntent.ts`).
  - **Review for deletion:** `stripeWebhookSimple.ts`, `createPaymentIntentMinimal.ts` (look like debugging spares).

### KEEP (the reusable backend)
- `functions/src/payment/stripeWebhook.ts` — **gold standard.** Server-side order creation from payment metadata, signature verification, idempotency, deferred affiliate commission (avoids double-credit). Reuse verbatim per shop.
- `functions/src/order-processing/functions.ts` — order completion + commission recompute.
- `functions/src/affiliate/**` — `logAffiliateClickV2` (callable + http), conversion processing, triggers.
- `functions/src/email-orchestrator/**` — transactional email.
- `functions/src/protection/**` — CORS, rate-limiting, budget-monitor. Useful as-is.
- `functions/src/config/**` — payment config, database config.

### Already-fixed security items (this session, 2026-05-29)
- `firestore.rules`: `products` write → `isAdmin()` (was any authenticated user — price-rewrite hole).
- `firestore.rules`: `affiliateClicks` create → `false` (clicks are server-only; was forgeable).
- `functions/src/customer-admin/functions.ts`: `createAdminUser`, `checkNamedDatabase`, `debugDatabase` now behind a fail-closed `ADMIN_MAINTENANCE_SECRET` guard (were unauthenticated).
- **Still open (operator action):** rotate the service-account key leaked in git history at `temp/admin.json` (`91b5fa1~1`). Deleting the file did NOT invalidate the key.

---

## 4. Frontend: keep / rework / delete (`src/`)

### DELETE
- `src/contexts/CartContext.jsx.backup-20250906-082320` — stray backup.
- **4 of 6 wagons** — stubs unrelated to a generic shop: `ambassador-wagon`, `campaign-wagon`, `fishtrip-wagon`, `weather-wagon`. (Per prior sweep, only Writers ~80% and Dining ~70% were real — and neither is needed for a print shop. Recommendation: **drop the wagon system entirely** for this product; build POD features as plain routes/components. Revisit only if a shop genuinely needs pluggable add-ons.)
- B8Shield-specific utils with no generic role: `trustpilotAPI.js`, `trustpilotChecker.js`, `trustpilotDemo.js`, `csvReviews.js`, `googleSheetsService.js`, `translationSheets.js`, `adminUIDManagerTest.js`, `affiliateDebug.js` (debug-only). Review each; most are leaf utilities, safe to remove.

### REWORK — de-brand (mechanical, not architectural)
Brand coupling (~791 references) is concentrated in config + contexts. The fix is to make store identity **data-driven** via the EXISTING `settings` / `app-settings` Firestore collection + `AdminSettings` page (the mechanism already exists — it's just not wired for store identity yet).
- `src/config/urls.js` — hardcoded B8Shield URLs/domains → config.
- `src/config/socialMedia.js` — brand social links → config.
- `src/config/countries.js` — keep mechanism, drop Sweden-only defaults.
- `src/contexts/OrderContext.jsx` — hardcoded `companyName: 'B8shield Admin'` and demo company seeds → config / remove.
- `src/contexts/TranslationContext.jsx`, `src/contexts/LanguageCurrencyContext.jsx` — keep i18n engine; strip B8Shield copy.
- **Store identity to surface in AdminSettings:** shop name, logo, domain, currency, VAT rate, support email, social links.

### REWORK — collapse B2B/B2C duality
`AdminProducts.jsx` carries `b2b`/`b2c` tabs, dual images (`b2bImageFile`, `b2cGalleryFiles`), EAN/SKU, product groups. A print shop is **B2C only**. Strip the B2B path (reseller pricing, B2B portal, `AffiliatePortal` reseller bits) to simplify the model and the admin UI. This also removes a lot of the `companyName`/reseller assumptions.

### REWORK — parameterize VAT/currency
Localized, small surface:
- `src/utils/affiliateCalculations.js` — **already takes `vatRate` as an arg** (defaults `0.25`). Just feed it from config. Clean as-is otherwise.
- `src/utils/affiliatePayouts.js:213` — hardcoded `currency: 'SEK'` → config.
- Drive currency/VAT from the shop's `settings` doc.

### KEEP ~as-is (the reusable frontend)
- Storefront: `src/pages/shop/PublicStorefront.jsx`, `PublicProductPage.jsx`, `ShoppingCart.jsx`, `Checkout.jsx`, `OrderConfirmation.jsx`, `OrderReturn.jsx`, `CustomerAccount.jsx`, `CustomerLogin/Register.jsx`.
- Affiliate UI: `AffiliatePortal.jsx`, `AffiliateRegistration.jsx`, `AffiliateLogin.jsx`, `AffiliateAnalyticsTab.jsx`.
- Admin: `AdminProducts.jsx` (after B2B trim), `AdminOrders.jsx`, `AdminOrderDetail.jsx`, `AdminAffiliates*.jsx`, `AdminAffiliatePayout.jsx`, `AdminSettings.jsx`, `AdminUsers.jsx`, `AdminDashboard.jsx`.
- Core: `CartContext.jsx`, `AuthContext.jsx`, `AffiliateTracker.jsx`.
- Affiliate logic utils: `affiliateCalculations.js`, `affiliatePayouts.js` (fix the payout race — see §6), `referrerParser.js`.

---

## 5. The net-new POD layer (~15%)

Built on top of the existing product + order + image-upload machinery (which already handles multi-image products).

1. **Customer design upload** — on the product page, let the buyer upload artwork. Reuse the existing Firebase Storage upload path (`src/utils/fileUpload.js`, `imageOptimization.js`). Attach the uploaded asset reference to the cart line item → carried into order metadata by the existing checkout/webhook flow.
2. **Mockup / preview** — show the customer's artwork composited on the product (start simple: overlay on a product image; no need for a 3D mockup engine v1).
3. **Print-queue admin view** — a re-skin/filter of the existing `AdminOrders` list: show orders needing print, with the attached artwork downloadable, and a status flow (new → printing → ready → shipped/picked-up). The shop fulfills in-house. This is mostly configuration of the order-status system that already exists (`orderStatuses` collection).

**Why this is small:** none of it requires new payment, new auth, or new tenancy. It's "attach a file to a product/order, and add a status column."

---

## 6. Affiliate fraud/correctness holes to fix before trusting payouts
(Carried from the prior sweep; verify against current code before fixing.)
1. **No self-referral prevention** — an affiliate can use their own code at checkout. Add a guard.
2. **No quantity/price validation in commission math** (`item.price * item.quantity`, no bounds). Add guards.
3. **Payout race** — `src/utils/affiliatePayouts.js` reads balance OUTSIDE the transaction → concurrent overdraw. Move the read inside the transaction.
4. Payouts are bookkeeping-only (manual). **Fine for this architecture** — each shop pays its own affiliates however it likes. No Connect needed.

---

## 7. Per-shop deployment (the operational gap)

"One instance per print shop" needs a repeatable spin-up. This does NOT exist yet and is the main net-new *operational* work (vs. code):
- Per shop: a Firebase project (Firestore + Functions + Hosting + Storage), a Stripe account/keys, the shop's `settings` doc (identity/VAT/currency), and a deploy.
- **Recommended v1:** a documented, semi-manual checklist + a setup script (`createAdminUser` already exists, now secret-guarded, to bootstrap the first admin). Automate later if volume justifies it.
- **Trade-off to decide later:** truly separate Firebase projects (clean isolation, more ops) vs. one project with a `shopId` partition (less ops, but reintroduces the multi-tenant complexity we deliberately avoided). For the chosen architecture, **separate projects** is the consistent choice.

---

## 8. Suggested sequence

1. **Cleanup** — delete dead V1 (`functions/index.js`), `webhook-standalone.js`, stub wagons, stray backups. Make the repo honest about what's live. *(Low risk, high clarity. Do first.)*
2. **De-brand vertical slice** — config-driven store identity (name/logo/currency/VAT from `settings`), run the storefront + one product + checkout as a non-B8Shield shop. Proves salvageability tangibly.
3. **Collapse B2B/B2C → B2C-only.**
4. **POD layer** — design upload → mockup → print-queue.
5. **Affiliate hole fixes** (§6).
6. **Per-shop deploy playbook** (§7).
7. **Rotate the leaked key** (§3) — operator action, do whenever.

---

## 9. Honest risks
- **"Permanently mid-migration" disease.** Two backends (dead V1 + live V2) coexist. Step 1 (delete dead code) is non-negotiable before repurposing, or the ambiguity that stalled 3 prior migrations comes along for the ride.
- **Firebase lock-in.** The shelved Supabase plan still has merit long-term (cost predictability, TypeScript, RLS). Doing salvage AND a stack migration at once = migration attempt #4. **Decision: salvage on Firebase first, prove the business, migrate later only if it pays off.**
- **Per-shop ops cost.** Many separate Firebase/Stripe setups is real recurring work. Validate that print shops will pay enough to cover it before scaling instance count.
