# Tenant Isolation Remediation Plan (2026-06-18)

Excellent — this is the key infrastructure. There's already a `rules-tests/` directory with isolation tests, and `authGuard.ts` provides `requireAdmin`/`requirePlatform` but crucially NO `requireAdminOfShop(shopId)` helper — which is exactly the gap that causes all the customer-admin and email-orchestrator findings. The `syncUserClaimsOnWrite` trigger confirms the claims model. I have everything I need.

I have fully verified the audit against the live code. Producing the remediation plan.

---

# TENANT ISOLATION REMEDIATION PLAN — 10-20 Shop Watertight Future

## 1. EXECUTIVE VERDICT

**Is the platform watertight today? No.** Phase A (Firestore rules) closed the client-direct-SDK leaks well, but two whole layers remain wide open: **Cloud Functions (Admin SDK bypasses all rules)** and **Storage (flat, non-partitioned paths)**. A malicious authenticated shop admin can today destroy another shop's customers, exfiltrate another shop's order PII, and overwrite another shop's product/branding images. These are not theoretical — I traced each to live, reachable code.

**The structural root cause:** Storage rules and Cloud Functions cannot read the named Firestore DB, so they trust the token claim or nothing at all. There is **no `requireAdminOfShop(shopId)` helper** in `functions/src/utils/authGuard.ts` — only `requireAdmin` (role-only) and `requirePlatform`. Every function finding is a missing shop-parity check that this one helper would fix.

**Top 3 risks (ranked):**

1. **Cross-shop customer destruction via Admin-SDK callables** (`deleteCustomerAccount`, `deleteB2CCustomerAccount`, `toggleCustomerActiveStatus` — `functions/src/customer-admin/functions.ts:76, 202, 347`). A shop-X admin passes a shop-Y customerId; the function checks only `role=='admin'` (verified at `:85`), then deletes the Auth account and orphans orders. **Direct, authenticated, irreversible cross-tenant data destruction.** Compounded by an order-of-operations bug: Auth is deleted (`:106`) *before* the Firestore doc, so `syncUserClaimsOnWrite` hits `auth/user-not-found` and never revokes the victim's tokens.

2. **Flat Storage paths let any admin overwrite/read any shop's files** (`storage.rules:47-102`). `isAdmin()` checks `token.role` only, never `token.shopId`. Products, branding, marketing-materials, affiliate invoices, admin-documents, CRM docs all live in unpartitioned paths. A shop-X admin can corrupt shop-Y's storefront branding/product images (no versioning = permanent data loss) and read shop-Y affiliate invoices (financial PII). Plus a ~1h stale-token window where a demoted admin still writes.

3. **Client-controlled `shopId` poisons orders + affiliate/campaign attribution** (`createPaymentIntent.ts:269`). `resolvedShopId = shopId || DEFAULT_SHOP_ID` accepts the client's value with no validation against the `shops` collection, then `stripeWebhook.ts:179` stamps it on the order. Combined with the **unscoped affiliate query in order-processing** (`functions.ts:640-645`, verified — no `.where('shopId')`), this enables cross-shop commission siphoning and revenue misattribution. (Note: `createPaymentIntent.ts:100-112` *is* correctly scoped — the leak is the order-processing copy and the unvalidated shopId.)

---

## 2. FINDINGS RANKED BY REAL SEVERITY (deduped across layers)

### CRITICAL

| # | Finding | One-line attack | Fix |
|---|---------|-----------------|-----|
| C1 | **Cross-shop customer delete/disable** (`customer-admin/functions.ts:76,202,347`) | Shop-X admin calls `deleteCustomerAccount({customerId: shopY_uid})`; only `role=='admin'` checked → deletes Auth + orphans orders. | Add shop-parity check after fetching both docs: `if (!admin.platform && admin.shopId !== target.shopId) throw`. Apply to all 3 functions. |
| C2 | **Flat Storage products/branding overwrite** (`storage.rules:47-58`) | Shop-X admin `uploadBytes('products/{shopY_id}/...')`; `isAdmin()` ignores shopId → overwrites shop-Y images (no versioning). | Partition paths to `products/{shopId}/...`, `branding/{shopId}/...`; rule `isAdminOfShop(shopId)` reading `token.shopId`. |
| C3 | **approveAffiliate cross-shop escalation** (`email-orchestrator/.../approveAffiliate.ts:33-48`) | Shop-X admin approves shop-Y's pending application → mints a shop-Y affiliate they control, reads applicant PII. | Replace `verifyAdminAuth` with `verifyAdminOfShop(appData.shopId)`. |
| C4 | **Order-processing affiliate query unscoped** (`order-processing/functions.ts:640-645`) | Order in shop-A with code "ALICE" matches shop-B's affiliate (same code) → recurring commission siphon to wrong shop. | Add `.where('shopId','==', orderData.shopId || DEFAULT_SHOP_ID)` + post-fetch assert `affiliate.shopId === orderData.shopId`. |

### HIGH

| # | Finding | One-line attack | Fix |
|---|---------|-----------------|-----|
| H1 | **Client-supplied shopId not validated** (`createPaymentIntent.ts:269` → `stripeWebhook.ts:179`) | Tamper `shopId` in checkout POST → order + campaign/customer-stats stamped to arbitrary shop. | Derive shopId server-side from request origin/Referer; validate against `shops` collection; never trust `request.body.shopId`. |
| H2 | **Unscoped B2C customer-stats + affiliate updates in order processing** (`functions.ts:542-558, 640-650, 150-184`) | Craft order referencing shop-B `b2cCustomerId` / campaign → poisons shop-B analytics & commission. | Verify `customer.shopId === orderData.shopId` before stat update; scope campaign-match by shopId; validate `affiliate.shopId === campaign.shopId`. |
| H3 | **Storage: marketing-materials, affiliate invoices, CRM docs, admin-docs, pages, orders unpartitioned** (`storage.rules:35-102`) | Shop-X admin reads/writes shop-Y customer files, affiliate invoice PDFs (financial PII), page attachments. | Partition every path with `{shopId}` prefix + `isAdminOfShop(shopId)`; thread shopId through `marketingMaterials.js`, `affiliatePayouts.js`, `fileUpload.js`, `adminDocuments.js`, `imageUpload.js`. |
| H4 | **validateDiscountCode cross-shop leak** (`affiliate/callable/validateDiscountCode.ts:29-34`) | Anonymous caller submits any shop's affiliate code → learns its `checkoutDiscount`; no shopId param exists. | Add `shopId` to request payload; `.where('shopId','==', request.data.shopId)`. |
| H5 | **logAffiliateClick campaign query unscoped** (`affiliate/callable/logAffiliateClick.ts:75`) | Caller with a campaign code increments shop-Y's `totalClicks` → corrupts campaign stats. | Add `.where('shopId','==', shopId)` (shopId already at `:43` from affiliate doc). |
| H6 | **passwordResets / emailVerifications lack shopId** (`sendPasswordResetEmail.ts:50`, `confirmPasswordReset.ts:36-39`, `sendCustomEmailVerification.ts:84`) | Reset code looked up by code only across all shops; whoever holds a code resets across tenant boundary. | Stamp `shopId` on create; query by `resetCode AND shopId`; backfill. |
| H7 | **sendOrderConfirmationEmail / sendOrderNotificationAdmin leak order PII** (`email-orchestrator/...:51,67`) | Shop-X admin passes shop-Y orderId + attacker email → confirmation with shop-Y PII sent to attacker; enumerate orders. | Fetch order doc, verify `order.shopId === caller.shopId` (or platform); use order doc data, not request `customerInfo`. |
| H8 | **sendLoginCredentialsEmail cross-shop credential leak** (`email-orchestrator/.../sendLoginCredentialsEmail.ts:37`) | Shop-X admin emails shop-Y user temp password/affiliate code → takeover. | Verify target `user.shopId === caller.shopId` (or `requirePlatform`). |
| H9 | **No token revoke on user delete (order-of-ops)** (`customer-admin/functions.ts:106 vs 181`) | Auth deleted before Firestore → trigger gets `user-not-found`, never revokes; victim's stale token valid ~1h. | `revokeRefreshTokens()` before `deleteUser()`; combine with C1 shop check. |
| H10 | **adminUIDs global read/write** (`firestore.rules:389-391`) | Shop-X admin `getDocs(adminUIDs)` enumerates every platform + shop admin (uid/email/level). | Migrate role-toggle to a platform-callable; make rule `isPlatform()`; or deprecate collection. |
| H11 | **deleteB2CCustomer: orders query + auditLogs + adminCustomerDocuments unscoped** (`functions.ts:268,303`) | Email/customerId order query has no shopId → mutates shop-Y orders; auditLogs created without shopId. | Scope order queries by shopId; stamp shopId on auditLogs; add to backfill IN_SCOPE_COLLECTIONS. |
| H12 | **Storage stale-token window** (`storage.rules:21-22`) | Demoted admin's cached ID token (~1h) still passes `isAdmin()` → writes after demotion. | Mostly mitigated once paths are shopId-partitioned (stale shop-X token can't touch shop-Y); document as Firebase limitation; rely on `revokeRefreshTokens` + forced logout. |
| H13 | **PUBLIC READ on products/branding storage + Firestore products `read: if true`** (`storage.rules:48,55`; `firestore.rules:162`) | Enumerate any shop's product images/branding via SDK; products globally readable. | Keep public storefront read by design, but partition storage paths; consider authenticated reads or signed URLs for non-public assets. |

### MEDIUM

| # | Finding | One-line attack | Fix |
|---|---------|-----------------|-----|
| M1 | **adminPresence cross-shop enumeration** (`firestore.rules:378-381`) | Shop-X admin `onSnapshot(adminPresence)` sees all shops' admins online/email. | Stamp `shopId` on presence doc; rule `isPlatform() || resource.data.shopId == userDoc().shopId`. |
| M2 | **shops collection public read enables enumeration** (`firestore.rules:223-228`) | Any user `getDocs(shops)` lists all tenant configs/features. | `allow read: if isPlatform() || (isAdmin() && userDoc().shopId == shopId) || resource.data.status == 'active'` (or move public storefront read to a narrow field set). |
| M3 | **orders single-doc `get: if true`** (`firestore.rules:254`) | Authenticated shop-Y user reads shop-X order if they learn the ID. | Add authenticated cross-tenant guard while preserving anonymous guest confirmation (see finding fix #4). |
| M4 | **syncAdminClaims no shopId scope** (`customer-admin/functions.ts:524-576`) | Secret leak → re-claim all shops' admins in one call. | Optional `shopId` param to narrow; log + monitor calls. |
| M5 | **createPaymentIntent no shop-existence validation** (`:269`) | Invalid shopId → orphaned order. | Validate `shops/{shopId}` exists + active. |

### LOW / INFO (track, don't rush)
- `userWagonSettings` global read (`firestore.rules:366-369`) — dead code; **delete** the rule + dead `WagonRegistry` methods.
- `AffiliateAnalyticsTab` unscoped batch read (`AffiliateAnalyticsTab.jsx:57-62`) — blocked by rules today; add `where('shopId')` for defense-in-depth.
- `users/{userId}/profile.jpg` (`storage.rules:29-33`) — self-scoped + unused; leave.
- `userDoc()` perf scaling — intentional design (instant revokes); monitor, don't change.
- `orders/{orderId}` storage path — orphaned/unused; **remove** in Phase B cleanup.

---

## 3. PHASED PLAN (sequenced by dependency + risk)

> **Cross-cutting prerequisite (Phase 0):** Add `requireAdminOfShop(shopId, authUid)` to `functions/src/utils/authGuard.ts` (mirrors `isAdminOfShop` in rules: platform bypasses, else `user.shopId === shopId`). This single helper underpins Phases F and H. Also add a `resolveShopIdFromOrigin(origin)` util + a `shops` validation helper. **No behavior change yet — pure additions. Safe to deploy.**

### Phase F — Functions Isolation (DO FIRST — highest severity, code-only, no migration)
- **What:** Add shop-parity checks to every Admin-SDK callable that accepts a caller-supplied id. Targets: C1 (3 customer-admin functions), C3 (approveAffiliate), C4 (order-processing affiliate query), H1/H7/H8/H11, H9 (revoke-before-delete + reorder), H4/H5 (validateDiscountCode/logAffiliateClick scoping), H2 (B2C stats + campaign-match validation), M4/M5.
- **Why:** Admin SDK bypasses all rules; this is the only enforcement layer. Highest-severity, fully reachable, and these are localized code edits with no data migration.
- **Prereqs:** Phase 0 helper. For H1 server-derived shopId, decide the origin→shopId mapping source (the `shops` collection should carry a `domain` field, or use the existing URL-shopId convention).
- **Blast radius:** Medium. A bug locks legitimate same-shop admin actions. Platform admins (micke, kent) must always bypass — test that explicitly. Today only 2 platform admins exist, so a regression is low-impact and quickly caught.
- **Verify:**
  - **Unit (emulator + Admin SDK):** call each function as shop-X admin targeting shop-Y id → expect throw; as same-shop admin → succeed; as platform → succeed on any shop.
  - **Affiliate collision test:** seed identical `affiliateCode` in two shops, run `processOrderCompletion` for shop-A order → assert shop-A affiliate credited, shop-B untouched.
  - **shopId-tamper test:** POST `createPaymentIntent` with mismatched origin/shopId → assert resolved server-side, not from body.
  - **Live canary:** after deploy, place one real test order per live shop (b8shield, melodieomc, sillmans), verify correct attribution.

### Phase H — Claims / Provisioning Hardening (parallel-safe with F)
- **What:** H9 revoke-before-delete + Firestore-before-Auth reorder; H10 adminUIDs → platform-callable or `isPlatform()` rule; M1 adminPresence shopId stamp + scoped read; M2 shops read scoping; M4 syncAdminClaims shopId param + logging. Add `auditLogs` shopId stamping (H11).
- **Why:** Closes the privilege-retention window and admin-roster enumeration; depends on the same parity helper.
- **Prereqs:** H10 rule change requires refactoring `AuthContext.updateUserRole` → `adminUIDManager` writes into a platform-callable first (else shop admins lose role-toggle). M1 requires `useAdminPresence.js` to stamp `shopId` before the rule tightens (write old+new during transition).
- **Blast radius:** Medium-high for H10/M1/M2 — rule changes can lock out live flows. **These are STOP-and-surface rule deploys per your working method.**
- **Verify:** emulator test in `rules-tests/firestore-isolation.test.cjs` — shop-X admin denied on `adminUIDs`, `adminPresence` of shop-Y, `shops` collection enumeration; own-shop + platform pass. Confirm role-toggle still works for a shop admin after the adminUIDs refactor.

### Phase B — Storage Partitioning (after F/H; needs client coordination + migration)
- **What:** C2 + H3 + H13. Restructure all shop-scoped paths to `{type}/{shopId}/...`; add `isAdminOfShop(shopId)` to `storage.rules` reading `token.shopId`/`token.platform`; thread `shopId` through every uploader (`ProductForm.jsx`, `AdminStorefront.jsx`, `imageUpload.js`, `marketingMaterials.js`, `affiliatePayouts.js`, `fileUpload.js`, `adminDocuments.js`, `DocumentCenter.jsx`). Remove dead `orders/` and the unused `users/profile.jpg` stays.
- **Why:** Storage is the second rules-enforced layer; once partitioned, H12 (stale token) collapses to within-shop only.
- **Prereqs:** Phase F deployed (the token claim is now reliably synced via `syncUserClaimsOnWrite` — confirmed working). **Migration:** one-time Admin SDK script to copy existing flat files → shopId-prefixed paths AND update the Firestore docs that reference them (imageUrl/storagePath fields). Dual-allow old+new paths during transition.
- **Blast radius:** **HIGH.** A premature rule deploy (before all uploaders updated + files migrated) locks every admin out of image uploads and can break storefront image rendering. Must be staged: (1) ship client code writing new paths, (2) migrate existing files, (3) deploy partitioned rules with a grace fallback, (4) monitor for permission-denied, (5) remove fallback.
- **Verify:** emulator storage rules tests (shop-X token denied writing `products/{shopY}/...`); a dry-run migration script (count files, report, no writes) before `--commit`; post-deploy live check that each shop's storefront still renders images and admins can upload.

### Phase I — Data-Integrity & Backfill (cleanup, last)
- **What:** H6 (passwordResets/emailVerifications shopId + scoped lookup), H11 (auditLogs/adminCustomerDocuments shopId + backfill), M3 (orders `get` authenticated guard), M5 (shop-existence validation). Add missing collections to `scripts/backfill-shopid.cjs` IN_SCOPE_COLLECTIONS. Delete dead `userWagonSettings` rule + `WagonRegistry` methods. Add `where('shopId')` to `AffiliateAnalyticsTab.jsx` and `DynamicRouteHandler.jsx` (client-query layer).
- **Why:** These are latent (no current UI reads auditLogs) or low-frequency; safe to do after the reachable holes are closed.
- **Prereqs:** Phases F/B (so new writes are already scoped before backfilling legacy).
- **Blast radius:** Low-medium. Backfill scripts must run dry-run first.
- **Verify:** backfill `--dry-run` report; emulator test that a shop-A reset code can't reset a shop-B user; rules test for `DynamicRouteHandler` slug scoping.

### Phase G — Client-Query Scoping (defense-in-depth, low priority)
- **What:** Add `where('shopId','==', shopId)` to client queries that rely solely on rules today: `DynamicRouteHandler.jsx:46-51` (confirmed missing — real cross-tenant slug leak, do this in Phase I), `AffiliateAnalyticsTab.jsx:57-62`.
- **Why:** Defense-in-depth + correctness (slug collision loads wrong shop's page). Rules already block the data, but `DynamicRouteHandler` leaks slug *existence*.
- **Verify:** browser test with two shops sharing a slug → each loads its own page.

**Sequence rationale:** F first (highest severity, no migration, code-only, instantly deployable per-function). H parallel (same helper, but rule changes need staging). B after F (depends on synced claims + needs the biggest migration/coordination). I and G last (latent/cleanup).

---

## 4. PERMANENT INVARIANTS + ENFORCEMENT

| # | Invariant | Enforcement |
|---|-----------|-------------|
| INV-1 | **Every shop-scoped collection MUST carry a non-null `shopId`.** | Add a CI check parsing `backfill-shopid.cjs` IN_SCOPE_COLLECTIONS against a canonical list; a `firestore-isolation.test.cjs` case per collection asserting cross-shop deny. Code-review checklist item: "new collection → is it shop-scoped? add to backfill + rules + test." |
| INV-2 | **Every Admin-SDK function deriving authority MUST call `requireAdminOfShop(shopId)` and MUST derive shopId from the caller's user doc or request origin — NEVER from the request payload.** | Lint rule / grep CI gate: flag any `request.body.shopId` or `request.data.shopId` used without passing through `resolveShopIdFromOrigin` or `requireAdminOfShop`. Code-review: "does this function trust a caller-supplied id?" |
| INV-3 | **Every Storage path for shop-scoped data MUST be `{type}/{shopId}/...` and its rule MUST call `isAdminOfShop(shopId)`.** | `storage.rules` emulator test: a shop-X token denied on shop-Y path. Lint: grep uploaders for `ref(storage, ...)` paths missing a shopId segment. |
| INV-4 | **Every client query on a shop-scoped collection MUST include `where('shopId','==', useShopId())`.** | grep CI gate for `collection(db, '<scoped>')` queries lacking a shopId clause; code-review checklist. |
| INV-5 | **Authority checks in rules MUST read the user DOC (`userDoc()`), not the token claim** (instant revokes); Storage (which can't) MUST be shopId-partitioned so a stale claim can't cross tenants. | Already the documented convention (firestore.rules:23-26). Encode as a review checklist note; the partitioning in Phase B makes it true for Storage. |
| INV-6 | **Cross-shop operations are PLATFORM-ONLY.** Any function/flow touching >1 shop must `requirePlatform`. | Review checklist + `requirePlatform` guard; emulator test that shop admins are denied multi-shop operations. |
| INV-7 | **Rules deploys are STOP-and-surface.** | Already your working-method rule. Add a `firebase deploy --only firestore:rules,storage` gate that requires explicit human go + a passing `rules-tests/` run first. |

**The single highest-leverage permanent fix:** a CI emulator gate that runs `rules-tests/firestore-isolation.test.cjs` (already exists) **plus a new functions-isolation suite** on every PR, with a matrix of {platform admin, shop-X admin, shop-Y admin, customer, anonymous} × {each collection/function} × {read, list, create, update, delete}. This turns every invariant above into an automated regression test.

---

## 5. SAFE-TO-DEPLOY-NOW vs STAGED MIGRATION

### Safe to apply + deploy now (low-risk, clearly correct, no data migration, no client coordination)
- **Phase 0 helper additions** (`requireAdminOfShop`, `resolveShopIdFromOrigin`) — pure additions, nothing calls them yet.
- **Phase F function-layer shop checks** — C1, C3, C4, H2, H4, H5, H7, H8, H11 (query scoping), H9 (revoke + reorder), M4, M5. These are server-only code edits; a regression only affects same-shop admin actions and is caught by the canary test order. Deploy function-by-function. **Caveat for H1** (server-derived shopId): the origin→shopId mapping must be correct for all 3 live storefront domains before flipping off `request.body.shopId` — verify the mapping covers b8shield/melodieomc/sillmans first, otherwise checkout breaks.
- **Delete dead `userWagonSettings` rule + `WagonRegistry` methods** (low finding) — verified unreferenced.
- **`DynamicRouteHandler.jsx` + `AffiliateAnalyticsTab.jsx` shopId filter** — additive client query narrowing; only effect is correctness.

### Needs staged migration / explicit go (rule deploys + data moves)
- **Phase B Storage** — biggest risk. Requires: client uploaders shipped → file migration script (dry-run then commit) → partitioned rules with grace fallback → monitor → remove fallback. **Do not deploy partitioned storage.rules before client code + migration.**
- **H10 adminUIDs `isPlatform()` rule + M1 adminPresence + M2 shops read** — rule changes that can lock out live flows (role-toggle, presence heartbeat, storefront shop config read). Stage: add shopId stamping to writers first, dual-write window, then tighten read. **STOP-and-surface deploys.**
- **H6 / H11 backfills** (passwordResets, emailVerifications, auditLogs, adminCustomerDocuments) — run `backfill-shopid.cjs --dry-run` first; these collections were never stamped, so legacy docs need careful shopId inference (match by email → user doc).
- **M3 orders `get` rule change** — must preserve anonymous guest order-confirmation reads; test the guest flow in emulator before deploy.

---

**Files referenced (all absolute):**
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/firestore.rules`
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/storage.rules`
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/utils/authGuard.ts` (add `requireAdminOfShop`)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/customer-admin/functions.ts` (C1, H9, H11, M4)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/order-processing/functions.ts` (C4, H2)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/payment/createPaymentIntent.ts:269` (H1, M5)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/payment/stripeWebhook.ts:179` (H1)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/affiliate/callable/validateDiscountCode.ts` (H4)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/affiliate/callable/logAffiliateClick.ts:75` (H5)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/email-orchestrator/functions/{approveAffiliate,confirmPasswordReset,sendPasswordResetEmail,sendCustomEmailVerification,sendOrderConfirmationEmail,sendOrderNotificationAdmin,sendLoginCredentialsEmail}.ts` (C3, H6, H7, H8)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/functions/src/auth/syncUserClaimsOnWrite.ts` (claims model, H9 context)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/src/components/shop/DynamicRouteHandler.jsx:46-51` (Phase G/I)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/rules-tests/firestore-isolation.test.cjs` (existing — extend for INV gates)
- `/Users/mikaelohlen/Cursor Apps/b8shield_portal/scripts/backfill-shopid.cjs` (add collections — H6, H11)