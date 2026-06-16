# P4.5b — Affiliate add-on full enforcement + close wagon gate-bypasses

**Status:** PLAN — awaiting Mikael's approval. No code until approved.
**Date:** 2026-06-16
**Builds on:** the add-on rails ([[addons-platform-control]], docs/ADDONS_PLATFORM_CONTROL_PLAN.md). Admin side of affiliate is already gated; this finishes the storefront + checkout + functions, and closes the 4 documented cross-wagon gate-bypasses.
**Follows [[working-method]]:** plan-first (high-stakes, money path), 3-way cross-check (platform↔admin↔shop), adversarial verify, deploy + live-verify. **⚠️ TOTAL-PARITY INVARIANT is the #1 risk** (see below).

## THE central risk — total-parity (read first)
The affiliate checkout discount is computed **identically** on client and server:
- **Client** `CartContext.calculateTotals`: `total = subtotal − discountAmount + shipping`, where `discountAmount = Math.ceil(subtotal × checkoutDiscount/100)` (applied in `applyDiscountCode`, CartContext.jsx:328-389 + auto-apply effect :70-124).
- **Server** `createPaymentIntent.ts` `computeOrderTotalsSek`: re-derives the SAME formula from the affiliate doc (lines ~79-115); the Stripe charge is `Math.round(total×100)` øre. The client `amount` is drift-logging only, never charged.

→ They agree because both apply the same discount. **If I gate only one side, the charge ≠ the displayed total = a parity break** (overcharge or undercharge). **RULE: the discount must be gated on BOTH the client AND the server, at the shared chokepoint (the affiliate-code lookup), or on neither.** Every slice below that touches the discount changes client + server together and re-verifies parity.

## Scope (locked: P4.5b chosen as the next phase)
Gate the `affiliate` feature flag across the storefront/checkout/functions so a platform-disabled affiliate add-on is fully inert end-to-end; plus close the 4 wagon gate-bypasses. Default-ON throughout (existing b8shield shop keeps affiliate until an operator disables it).

## Part 1 — Server-side features helper (NEW, prerequisite) — ✅ DONE (S1)
No server-side features reader existed. Added `functions/src/config/shopFeatures.ts` → `isShopFeatureEnabled(shopId, key): Promise<boolean>` reading `shops/{shopId}.features[key]`, returning `features?.[key] !== false` (default-ON; missing doc/field → true; fails OPEN on error). **DB correction:** `shops` lives in the NAMED DB `b8s-reseller-db` (verified: createShopUser.ts:18+51 reads `shops` via `config/database`'s `db`, which is `getFirestore(getApp(),'b8s-reseller-db')`; all affiliate/payment funcs resolve to the same DB). So the helper imports `db` from `config/database` (NOT a default-DB handle). `DEFAULT_SHOP_ID` from `config/tenancy`. Default-ON cases unit-verified to match the client `isFeatureEnabled` exactly. tsc clean.

## Part 2 — The money path (client + server TOGETHER, parity-critical)
**Single shared chokepoint = the affiliate-code lookup.** Gate it on `features.affiliate` on both sides:
- **Client** `CartContext`: in `applyDiscountCode` + the auto-apply effect, if `!isEnabled('affiliate')` → do NOT apply the discount (skip the `validateDiscountCode` call, leave `discountAmount=0`). `useShopFeatures()` is available (ShopFeaturesProvider is above CartProvider — confirmed). Also: when affiliate is OFF, ensure any stale `b8s_affiliate_ref` / cart discount fields are treated as no-discount (don't compute a discount from leftover localStorage).
- **Server** `createPaymentIntent.ts` `computeOrderTotalsSek`: before honoring `discountInfo/affiliateInfo`, resolve the shopId (already in `paymentData`, StripePaymentForm.jsx:250) and `if (!await isShopFeatureEnabled(shopId,'affiliate')) → discountAmount=0` (ignore the code). This is THE parity guard — it must match the client decision.
- **Server** `validateDiscountCode.ts`: return `{valid:false}` when the matched affiliate's shop has affiliate disabled (read `shopId` off the matched affiliate doc, then `isShopFeatureEnabled`). Defense-in-depth so a direct callable can't apply a discount.
- **VERIFY PARITY** after this slice: with affiliate ON → discount applies, client total == Stripe charge (unchanged from today). With affiliate OFF → no discount either side, client total == Stripe charge (both full price). Test both states.

## Part 3 — Commission/click server funcs (no parity risk, but entitlement integrity)
Gate these on `isShopFeatureEnabled(shopId,'affiliate')` (shopId already derived in each):
- `logAffiliateClickV2` (logAffiliateClick.ts:42 has shopId) — skip the click write + stat increments when off.
- `processB2COrderCompletionHttp` (functions.ts:409, the actual commission AWARD, reads orderData.shopId) — skip awarding affiliate commission when off.
- `reverseAffiliateCommissionOnCancel` (commissionReversal.ts:13, order doc has shopId) — symmetric: if commission was never awarded (affiliate off), don't reverse. (Careful: only skip if consistent with award-time; safest is to gate award + reversal on the same flag so they stay paired.)
- `approveAffiliate` (approveAffiliate.ts:50, admin-gated, shopId from application) — block approving a new affiliate when the shop's affiliate add-on is off (with a clear error).

## Part 4 — Storefront UI gating (no money path)
Hide/inert the affiliate surfaces when `!isEnabled('affiliate')`:
- **Routes** App.jsx: wrap `/affiliate-login` (:228), `/:shopId/affiliate-registration` (:241), `/:shopId/affiliate-portal` (:242) so they redirect when off. NOTE `/affiliate-login` has no `:shopId` prefix → resolving the feature there uses the path/default shop; confirm the gate resolves a shopId (may need the shop-scoped login path or a default-ON fallback).
- **ShopNavigation** (:200, :221 links + the :31-56 affiliate-data fetch) — hide the "Logga in/Ansök som affiliate" links + skip the affiliates query when off.
- **ShopFooter** (:127, :132-133 + :31-62 check) — hide affiliate footer links + skip the query when off.
- **AffiliateTracker** (App.jsx:182) — when off, don't write `b8s_affiliate_ref` / don't call `logAffiliateClickV2` (the upstream cut that prevents a discount from ever being seeded).

## Part 5 — Close the 4 wagon gate-bypasses (separate, low-risk, no money)
Gate each on its wagon feature (`dining`/`campaigns`):
- **TRIVIAL** — `AppLayout` `<MentionNotifications/>` (:232): hook already in scope (`isAddonEnabled`), change `{isAdmin && (...)}` → `{isAdmin && isAddonEnabled('dining') && (...)}`.
- **TRIVIAL** — `AffiliatePortalCampaigns` (:30 `useCampaigns`): gate at render (early-return when `!isEnabled('campaigns')`), or don't mount it from the parent. Don't conditionally CALL the hook — gate usage/render.
- **MEDIUM** — `AuthContext` `onNewB2BCustomer` (:568) + `OrderContext` `onOrderCompleted` (:591): the call sites are inside the provider components, so read `useShopFeatures()` at the provider top and guard `if (isEnabled('dining'))`. **VERIFY provider order:** AuthProvider/OrderProvider must sit INSIDE ShopFeaturesProvider (App.jsx tree). From the rails work the order is ShopProvider→StoreSettings→ShopFeatures→Auth→…→Order — so the hook IS available. If any ordering edge fails, fall back to reading features without the hook.

## Build order (slices — each verified + deployed; parity slices verified hardest)
1. **S1 — server features helper** (Part 1). No behavior change; unit-verify default-ON.
2. **S2 — MONEY PATH** (Part 2): client + server discount gate together. ⚠️ Verify parity in BOTH states (affiliate on → unchanged; off → both full price, charge==display). Highest scrutiny.
3. **S3 — commission/click funcs** (Part 3). Verify a disabled shop logs no clicks + awards no commission; an enabled shop unchanged.
4. **S4 — storefront UI** (Part 4): routes + nav + footer + tracker. Verify off → no affiliate UI + no ref written; on → unchanged.
5. **S5 — wagon bypasses** (Part 5). Verify off → no background dining/campaign logic; on → unchanged.
6. **S6 — 3-way sign-off**: adversarial audit of the whole chain + a dedicated PARITY proof (diff client vs server total math in both flag states) + build + deploy + live-verify.

## Out of scope
- Email funcs (sendAffiliateApplication/WelcomeEmail) — low priority; an off shop won't trigger them anyway once approve/registration are gated.
- The fishing-specific affiliate-guide BODY copy (separate content concern; already shopName-templated).
- Plan/billing tiers (P4.8).

## Decisions locked (Mikael, 2026-06-16)
- **Q1 — disable behavior:** HIDE/STOP NEW, KEEP DATA. Disabling affiliate stops new activity (signups, clicks, discounts, commission awards) + hides the UI, but leaves existing affiliate docs, earned balances, and the admin PAYOUT flow intact + reversible. Non-destructive; re-enabling restores normal operation. (Payouts are NOT frozen.)
- **Q2 — `/affiliate-login`:** LEAVE REACHABLE (no shop to resolve on a global route). Gate registration + portal + the money path + the functions. An affiliate landing on login for a shop with affiliate off simply has nothing actionable.
- **Q3 — commission award/reversal pairing:** YES, gate BOTH `processB2COrderCompletionHttp` (award) and `reverseAffiliateCommissionOnCancel` (reversal) on the same flag so they stay paired (no reverse-without-award mismatch if the flag flips mid-lifecycle).
