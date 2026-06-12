# Full Codebase Review — 2026-06-12

**Scope:** Backend (Cloud Functions + Firestore rules/platform), Storefront (B2C shop flow), Admin console, Affiliate system.
**Out of scope per instruction:** Stripe live-mode configuration.
**Method:** 5 parallel deep-review passes (backend, storefront, admin, affiliate end-to-end, architecture/platform), findings verified against actual code.
**Companion docs:** `POD_SALVAGE_SPEC.md` (direction), `SESSION_LOG_2026-05-29.md` (prior cleanup).

---

## Executive summary

The salvage thesis holds: the architecture (single-tenant Firebase deploy per shop, storefront + admin + affiliate engine) is sound and worth productizing. But the review found **one platform-level bombshell, a cluster of revenue/fraud-grade bugs in the order/affiliate pipeline, and a large but mechanical de-branding debt**. Several shop-flow bugs and two critical security holes were **fixed this session** (see §2). The rest is catalogued below with a recommended sequence (§9).

### The single most important finding

**C-0. Firestore rules are deployed to the wrong database.**
The app (client `src/firebase/config.js:27` and functions `functions/src/config/database.ts:8`) uses the named database **`b8s-reseller-db`**. But `firebase.json` has no `database` key in its `firestore` block, so `firebase deploy --only firestore:rules` targets **`(default)`** — a database the app never touches. The 188 lines of rules in this repo (including the security fixes from 2026-05-29) are protecting an empty database; the live `b8s-reseller-db` runs whatever rules were last set in the console.

This explains an otherwise impossible contradiction: the committed rules would **break the anonymous storefront** (`products` read requires auth, `pages`/`translations_*`/`passwordResets` have no rules at all → default deny), yet the live shop works.

**Required fix (do in this order, not piecemeal):**
1. Export/inspect the live rules on `b8s-reseller-db` from the console — that's the real current security posture.
2. Rewrite `firestore.rules` to cover **every** collection the client actually touches (~23 found), including public read for `products`, `pages`, `translations_*`, and constrained reads for affiliate-code lookup and guest order confirmation.
3. Add `"database": "b8s-reseller-db"` to the `firestore` config in `firebase.json` (multi-database array form), deploy, and re-test the whole anonymous shop flow.

**Do NOT just fix firebase.json and deploy the current rules file — that would take the live shop down.**

---

## 1. Critical & high findings (remaining, ranked)

### Money / fraud (order + affiliate pipeline)

| # | Finding | Where |
|---|---|---|
| 1 | **Client-trusted prices.** `createPaymentIntent` charges whatever `amount` the client sends; no server-side recompute against product prices. Anyone can buy anything for 1 kr. | `functions/src/payment/createPaymentIntent.ts:120-190` |
| 2 | **Unauthenticated order writes.** Rules allow anonymous `orders` create with arbitrary `total`, `status:'confirmed'`, `payment.status`, `affiliate.*`. Fake orders can be injected without paying. | `firestore.rules:80-85`, written from `Checkout.jsx`, `OrderReturn.jsx` |
| 3 | **Commission minting.** `processB2COrderCompletionHttp` is public (CORS `*`, no auth) and trusts the order doc. Combined with #2: create fake order with own affiliate code → POST orderId → real payable commission. (Replay/double-credit now blocked by the idempotency guard added this session, but single-shot minting remains until #2/#3 are closed.) | `functions/src/order-processing/functions.ts:405+` |
| 4 | **Three order-creation paths.** Checkout client-side, OrderReturn client-side, and the Stripe webhook all create orders; webhook dedup is a non-transactional query (race on retries). | `Checkout.jsx`, `OrderReturn.jsx`, `stripeWebhook.ts:107-119` |
| 5 | **No commission reversal.** Refunded/cancelled orders never claw back affiliate balance; payouts can include refunded sales. | nothing exists — needs building |
| 6 | **Self-referral + click inflation.** No buyer≠affiliate check; public HTTP click logger (`logAffiliateClickHttpV2`, CORS `*`, no dedup/rate limit) lets anyone inflate any affiliate's stats. | `functions/src/affiliate/**` |

**Recommended target state (one change closes #1–#4):** orders become **server-created only**, by the signature-verified Stripe webhook, with the amount recomputed from product IDs + quantities; the client passes a cart, never a price; commission is computed in the same transaction. This is the cornerstone of the productized version.

### Other security

| # | Finding | Where |
|---|---|---|
| 7 | **Unauthenticated email callables** — `sendLoginCredentialsEmail`, `sendAffiliateWelcomeEmail`, `sendOrderStatusUpdateEmail`, `sendOrderConfirmationEmail`, `sendOrderNotificationAdmin`, `sendAffiliateApplicationEmails` never check `request.auth`. Open branded-phishing mailer. | `functions/src/email-orchestrator/functions/*` |
| 8 | **Storage rules use a hardcoded 3-UID admin allowlist** (B8Shield UIDs incl. micke.ohlen) instead of the Firestore role model. | `storage.rules:14-20` |
| 9 | **No hosting security headers** (CSP/HSTS/XFO) and no cache-control headers for hashed assets. | `firebase.json` |
| 10 | **`passwordResets` is client-queried** (`ResetPassword.jsx:54`) — validation should be server-only; codes should ideally be stored hashed. | follow-up to this session's reset fix |
| 11 | **XSS surface**: Firestore-authored HTML rendered via `dangerouslySetInnerHTML` without DOMPurify (product groups, CMS pages, size guide). DOMPurify is already a dependency — wire it in. | `PublicProductPage.jsx:680+`, `DynamicPage.jsx:276`, `SizeGuideModal.jsx:46` |
| 12 | **PII in logs** — full order JSON / customer info logged in functions and browser console. | `functions.ts:482`, `createPaymentIntent.ts:148`, many client files |

### Correctness / cost

| # | Finding | Where |
|---|---|---|
| 13 | **Three different default commission rates** (15% / 20% / 20%) across one file; callable vs HTTP engines disagree; duplicate engine `processB2COrderCompletion` (callable) + deprecated trigger still exported. Collapse to one engine. | `order-processing/functions.ts` |
| 14 | **Currency divergence**: non-SEK customers are charged a converted ".99 smart price" but the order stores raw SEK totals — charged vs recorded amounts diverge, no reconciliation. | `priceConversion.js`, `StripePaymentForm.jsx`, order writers |
| 15 | **Mixed-cart shipping** uses only the first product's shipping table. | `CartContext.jsx:166-189` |
| 16 | **Admin full-collection reads**: dashboard reads ALL users+customers+orders on mount; every status change refetches all orders; B2C customer list fires 2 queries per customer (N+1); user pages load whole `users` collection. Firestore cost grows linearly with the business. | `AdminDashboard.jsx:116`, `AdminOrders.jsx:281`, `AdminB2CCustomers.jsx:46`, `AuthContext.jsx:421` |
| 17 | **Webhook payment-method details are dead code** — `payment_method` is never expanded, so card/Klarna branches never populate. | `stripeWebhook.ts:208-223` |
| 18 | **In-memory rate limiting / budget monitor** are per-instance and decorative under Functions v2 scaling. | `protection/**`, `order-processing/functions.ts` |
| 19 | **B2B bulk label printing uses fabricated placeholder addresses.** Disable or fix before anyone prints labels. | `AdminOrders.jsx:330-343` |
| 20 | **Cart line identity ignores variant/size**; same product in two sizes collides. | `CartContext.jsx:393` vs `Checkout.jsx` keys |

---

## 2. Fixed this session (code changed, builds verified)

**Shop user flow (frontend):**
- `OrderReturn.jsx` — missing `query/where/getDocs` imports meant the duplicate-order check on the Klarna/3DS return path **never ran** (ReferenceError swallowed by try/catch) → duplicate orders. Imports added; saved checkout info now also cleared after success.
- `Checkout.jsx` — the country selected at checkout never reached cart totals (`updateShippingCountry` was never called), so e.g. US/DE customers were charged Swedish shipping. Now synced. Also: the customer's **plaintext password is no longer persisted to localStorage** for the Klarna return flow.
- `CartContext.jsx` — manually entered discount codes were silently deleted on the next cart change (the auto-apply effect cleared any discount lacking an affiliate-link ref). Discounts now track their source (`link` vs `manual`); manual codes survive.
- `ShoppingCart.jsx` — "Rabattkod applicerad!" success toast showed even for invalid codes (`applyDiscountCode` returns `{success:false}`, doesn't throw). Toast now reflects the actual result.
- `OrderConfirmation.jsx` — first page every customer sees after paying showed a **blank shipping address** (read `shippingAddress`, orders store `shippingInfo` + name in `customerInfo`), a doubled currency ("SEK 249,00 kr"), and a hardcoded **"Väntar på betalning (Test)"** badge on paid orders. All three fixed.
- `PublicProductPage.jsx` — imported `react-helmet` while the app provides `react-helmet-async`; product meta tags could silently not render. Standardized.

**Backend (functions — compiled, needs deploy):**
- `order-processing/functions.ts` — **idempotency guard** added to `processB2COrderCompletionHttp`: the order is claimed in a Firestore transaction (`completionProcessed` flag) before any processing, so webhook+frontend double-invocation or retries can no longer double-send emails, double-increment customer stats, or **double-credit affiliate commission**.
- `email-orchestrator/functions/sendPasswordResetEmail.ts` — **account-takeover fix**: the reset code was supplied by the client, letting an attacker pre-choose the code for any victim's email and then confirm the reset themselves. Codes are now generated server-side (`crypto.randomBytes(32)`); both frontend contexts updated to stop generating/passing codes.
- `email-orchestrator/services/EmailService.ts` — the Gmail SMTP app password was **hardcoded in source**. Now read from `SMTP_USER`/`SMTP_PASS` env (already present in `functions/.env.b8shield-reseller-app`), failing loudly if missing. ⚠️ Rotate the old password (it lives in git history) — after rotation update the env file, not code.

**Deploy notes:** functions changes require `firebase deploy --only functions`. The SMTP env vars must be present in the deploy environment or email sending will fail fast at startup (intentional).

---

## 3. Productization gaps (turnkey "one deploy per print shop")

- **~82 hardcoded B8Shield domain references in 39 client files + 33 in functions** (`shop.b8shield.com`, `partner.b8shield.com`, `us-central1-b8shield-reseller-app.cloudfunctions.net` inline in `Checkout.jsx`/`OrderReturn.jsx`/`StripePaymentForm.jsx`, every email function's CORS array, OG images, structured data incl. a Södertälje postal address). → centralize into env/config.
- **App mode is chosen by subdomain** (`App.jsx:131-142`): on a customer's apex domain visitors land in the **B2B reseller portal**, not the shop. → drive from `VITE_APP_MODE` build config; exclude B2B portal + wagons from shop builds.
- **Email identity hardcoded**: 9 from-addresses, reply-to `info@jphinnovation.se`, admin recipients `micke.ohlen@gmail.com`; `B8S-` order prefix in 3 places; `commissionRate: 15`/`checkoutDiscount: 10`/VAT 25%/SEK baked in. → one per-shop config doc/env.
- **Currency architecture**: SEK is the hardwired base everywhere; the `STORE.currency`/`vatRate` config exists but is explicitly not wired into pricing. Currency conversion only activates when `hostname === 'shop.b8shield.com'`.
- **Stale env docs**: `env.example` describes a Next.js/Supabase stack (wrong app entirely); two conflicting example files. `create-admin.cjs` seeds the **default** DB (wrong DB) with hardcoded UID/email.
- **Cruft to delete**: dead V1 `functions/index.js` god-file, `webhook-standalone.js`, `stripeWebhookSimple`/`createPaymentIntentMinimal`, deprecated affiliate trigger, dead `config/payment-config.ts` + `cors-config.ts`, 4 wagon stubs (+ recommend dropping the wagon system), `AdminTranslations.jsx` (1,935 lines, route-disabled), duplicate `src/components/AdminRoute.jsx`, `affiliateDebug.js`, `adminUIDManagerTest.js` (`window.adminUIDTests` in prod), 75 one-off scripts in `scripts/`, committed `customer-classification-results.json` (customer data), `payment-packages.json`.

---

## 4. Affiliate engine — refresh plan (keeper, per direction)

**Keep:** affiliate doc model (`code`, `commissionRate`, `checkoutDiscount`, `stats`), 30-day localStorage last-ref-wins attribution, callable click logging, admin approval + payout-with-invoice flow, the affiliate portal UX.

**Recode (one focused work package):**
1. **Single commission engine, webhook-driven.** Commission is computed only where payment truth lives (signature-verified webhook / PaymentIntent amount), inside one transaction: check idempotency flag → increment stats → mark the attributed click by its real `clickId` (today the callable guesses "most recent unconverted click"). Delete the callable engine + deprecated trigger + public HTTP click endpoint.
2. **Reversal:** on order cancelled/refunded, decrement balance/earnings and mark the conversion reversed.
3. **Fraud guards:** self-referral check (buyer email/uid vs affiliate), click rate-limit/dedup by IP+code.
4. **One `calculateCommission`** shared client/server, driven by config `{vatRate, defaultCommissionRate, defaultCheckoutDiscount, currency}` — today there are 3 divergent defaults (15/20/20) plus a duplicated client implementation.
5. **Portal honesty:** implement or remove the `loadLiveStats` stub; "Konverteringar (30 dagar)" currently shows lifetime totals.
6. Strip B8Shield campaign machinery (KAJJAN/EMMA/special-edition hardcoding) into an optional module.

---

## 5. Redesign plan (both sides need a new design — agreed)

### What the reviews say is worth keeping
- **Storefront:** the product detail page (Nike-style layout, sticky mobile CTA, thumbnail rail) is the strongest piece; mobile interaction patterns; the config-driven footer model.
- **Admin:** the sidebar IA, the 4-column order-list model, the stat-card dashboard, dark mode coverage, the `settings/app` store-identity scaffolding.

### What must die
- Three competing visual dialects on the storefront (blue-indigo gradients vs flat black/white vs checkout-blue), emoji-heavy UI strings, the full-screen "🌍 Detecting Your Location" interstitial, B8Shield fishing copy baked into the homepage.
- Admin: per-page bespoke tables/badges/date-formatters/spinners (every page rolls its own), the B2B/admin mode toggle, giant single-page forms with no dirty-guard (work lost on navigation).

### Recommended approach
1. **Design system first** (tokens: type scale, spacing, one color system, radius, shadows) — run `/design-consultation` to pick the aesthetic direction, since visual taste is the owner's call; everything below is independent of which direction wins.
2. **Storefront = data-driven blocks.** Rebuild the homepage as configurable sections (hero, feature grid, category grid, social proof) fed from `settings`/`pages`, so each print-shop customer gets their own look without code. One shared `<OrderSummary>` (cart/checkout/confirmation currently triplicate it). Standardized skeleton/empty/error states. Decompose the 1,200-line `Checkout.jsx` into step components.
3. **Admin = shared primitives.** Extract `<DataTable>` (server-side pagination), `<StatusBadge>`, `<PageHeader>`, `<StatCard>`, one `formatDate`/total-resolver util, a `useCollection` hook with limits — then re-skin the 22 pages onto them (most pages become thin). Add the **print-queue view** from the POD spec as the flagship new admin page.
4. **Collapse B2B duality** as part of the reskin, not before — deleting the reseller portal pages removes ~a third of the surface to redesign.

---

## 6. Suggested sequence

1. **Platform truth** (½ day): export live rules from `b8s-reseller-db`; rewrite `firestore.rules` for all 23 collections; point `firebase.json` at the named DB; deploy + anonymous-flow smoke test. Fix storage.rules admin check. Add hosting headers.
2. **Deploy this session's function fixes**; rotate SMTP password + service-account key + GitHub PAT (still pending per `security_pending_rotations`).
3. **Order pipeline hardening** (the cornerstone): server-side price recompute, webhook-only order creation (deterministic doc ID = paymentIntentId), auth on email callables. Closes findings #1–#4, #7.
4. **Affiliate refresh** (§4).
5. **Productization config layer** (§3): env-driven identity/domains/mode, delete cruft.
6. **Redesign** (§5): design system → storefront blocks → admin primitives → B2B removal.
7. New POD features per spec: design upload, mockup preview, print queue.
