# Plan — Multi-tenant + Super Admin platform

**Status:** Proposal, NO code. Awaiting Mikael's approval.
**Goal:** Turn the single-store app into a multi-tenant platform: every shop is a `shops/{shopId}` entity, all data scoped by `shopId`, with a **Super Admin** layer (above shop-admin) to list / kill-switch / provision / impersonate shops.
**Why this is the keystone:** It's the deferred tenancy migration. Without it there is no "all stores" to manage, and no enforceable kill switch (the reason multi-tenant beat per-deploy). It's also the **highest-stakes work** in the project — a scoping bug = one shop seeing another's orders/customers. Hence: phased, rules-first-thinking, heavy verification, explicit go before any migration/deploy.

---

## Current reality (from audit)

- **Single-tenant.** No `shopId`/`storeId`/`tenantId` anywhere. ~30 collections, all global. `settings/app` is the one config singleton (already behind the `shopConfig` seam).
- **~60–75 query sites** across `src/` (~45–55) + `functions/` (~15–20) would need `shopId` scoping. 15–18 collections carry shop data (products, orders, b2cCustomers, affiliates, affiliateClicks, campaigns, pages, productGroups, marketingMaterials, payouts, applications, + wagon collections).
- **Orders created server-side** by the Stripe webhook (`functions/src/payment/stripeWebhook.ts:112`) — must stamp `shopId` at creation; `processOrderCompletion` joins campaigns/affiliates/clicks and must scope by it.
- **Roles:** `users/{uid}.role` ∈ {admin, user}. NO platform tier. Firestore `isAdmin()` reads the user doc; Storage `isAdmin()` reads a custom claim (`token.role=='admin'`) set by the operator-only `syncAdminClaims` HTTP function. An `adminUIDs` collection already has a `level: 'super'/'admin'/'limited'` field (unused in rules) — a hook we can use.
- **Rules are flat/shop-unaware** — any admin can touch any data. `firestore.rules` has `isAdmin()`, `isActiveUser()`, `isUserOrAdmin()` helpers.
- **Impersonation already exists** (admin → affiliate portal) via URL params (`admin_access`/`admin_code`) + scoped query + a yellow "admin-läge" banner. **Reuse this pattern** for Super-Admin → shop impersonation.
- **Shop vs admin** decided by subdomain in `App.jsx:122-132`. No per-shop domain mapping yet.

---

## Data model (target)

```
shops/{shopId}                      ← NEW: one doc per shop (the tenant)
  ├─ name, ownerUid, accent, ...    ← absorbs today's settings/app.storeIdentity
  ├─ status: 'active'|'disabled'    ← KILL SWITCH
  ├─ paidUntil: timestamp           ← optional auto-disable basis
  ├─ domains: ['shop-x.web.app']    ← subdomain/domain → shopId resolution
  └─ createdAt, plan, ...

# Every shop-scoped collection gains a shopId field (flat model, NOT subcollections —
# keeps existing collection paths + queries minimal-diff, just adds a where('shopId','==',X)):
products/{id}        + shopId
orders/{id}          + shopId   (stamped by webhook)
b2cCustomers/{id}    + shopId
affiliates/{id}      + shopId
affiliateClicks/{id} + shopId
campaigns/{id}       + shopId
pages/{id}           + shopId
productGroups/{id}   + shopId
marketingMaterials, payouts, applications, wagon collections + shopId

users/{uid}
  ├─ role: 'user'|'admin'|'platform'   ← NEW 'platform' tier (super admin)
  └─ shopId: <which shop this admin belongs to>   (platform users: null/all)
```

**Flat `shopId` field vs subcollections:** chosen flat — it's a smaller diff (queries add one `where`), keeps Storage paths simple, and Firestore rules can enforce it. Subcollections would re-path everything.

---

## Roles & access (target)

- `user` — B2C shopper (unchanged).
- `admin` — **shop admin**, scoped to their `users/{uid}.shopId`. Sees only their shop.
- `platform` — **super admin** (Mikael), bypasses shopId scoping, manages all shops.

Mechanism reuses what exists: Firestore rules get `isPlatform()` + `belongsToShop(shopId)` helpers; the custom-claim sync (`syncAdminClaims`) extends to also stamp `shopId` and `platform` into the token so Storage + Firestore rules can scope without extra reads.

---

## Phased plan (each phase: build → verify → commit+push → STOP for go before any deploy/migration)

### Phase 0 — `shopId` data + context plumbing (NO URL-grammar change) — sequenced 2026-06-14
**Decision (2026-06-14):** the path-prefix URL-grammar rewrite is the highest 404-risk change and only pays off when shop #2 needs a distinct URL — which "build machinery first" defers. So Phase 0 ships ONLY the data/context plumbing that Phases 1–4 depend on; the `/:shopId/:countryCode` router + `productUrls.js` prefix shift move to a later step (Phase 0b), landing right before provisioning shop #2.

Phase 0 (this step):
- `src/config/tenancy.js`: `DEFAULT_SHOP_ID` + a single `resolveShopId(pathname)` — the ONE source of truth for path grammar (returns default today; later it parses the `/:shopId/...` prefix). No duplicated parsing anywhere else.
- `ShopContext` provides `shopId` (default for now) to the app.
- `shopConfig.js`: `shopConfigRef(shopId)` → `doc(db,'shops',shopId)`, with a SAFE FALLBACK to `settings/app` until the seed exists — the live site is unaffected before the seed runs.
- Thread `shopId` from `StoreSettingsContext` into `loadShopConfig(shopId)`.
- Seed script (STOP-and-surface — prepped, Mikael runs): copy `settings/app.storeIdentity` → `shops/{DEFAULT_SHOP_ID}`.
- **No router/URL/link change. No scoping. Fully reversible.**

### Phase 0b (LATER, before shop #2) — path-prefix URL grammar
- Add a default shopId constant (the existing store; internal id can stay `b8shield` since it's never user-visible — meteorpr is the brand, shopId is a data key).
- Add `ShopContext` that resolves the current shopId from the **first path segment** (`/{shopId}/{countryCode}/...`), with a fallback to the default shopId when the path has no valid shop prefix (so existing `/se/...` URLs keep working during transition). The whole app reads `shopId` from context.
- **Router:** add `/:shopId/:countryCode/...` route forms. Keep the legacy `/:countryCode/...` forms working (redirect to default-shop-prefixed, or treat segment[0] as country when it matches se/gb/us) so nothing 404s mid-migration.
- **URL helpers (productUrls.js):** the 3 helpers prepend the resolved shopId and read country from `segments[1]`. 70 call sites unchanged.
- `shopConfig` seam switches `settings/app` → `shops/{shopId}` (shopConfig.js:18, one line) + thread shopId through StoreSettingsContext.
- Seed ONE `shops/{shopId}` doc absorbing current `settings/app.storeIdentity`. **Seeding existing data = STOP-and-surface (Mikael runs/approves).** Until seeded, ShopContext falls back to `settings/app` so the live site is unaffected.
- **No scoping enforced yet** — everything still works single-shop. Reversible, safe.

**Phase 0 verification (must pass before commit):** every shop page loads under both `/{shopId}/se/...` and legacy `/se/...`; product/cart/checkout/affiliate links all resolve with the shopId prefix; admin console unaffected; build green; a read-only verifier confirms no link drops the shopId and no helper still reads country from `[0]`.

### Phase 1 — Stamp `shopId` on writes (backfill-safe)
- Every create path writes `shopId` (products, orders incl. the Stripe webhook, customers, affiliates, pages, etc.).
- One-time **backfill migration script** stamps `shopId='b8shield'` on all existing docs. ← destructive-adjacent: STOP, present script, Mikael runs or approves.

### Phase 2 — Scope all reads by `shopId`
- Add `where('shopId','==',shopId)` to the ~60–75 query sites (client + functions). Mechanical but broad; done in batches by area (shop pages → admin pages → functions), each batch built+verified.
- Requires Firestore composite indexes (shopId + existing filters) — generated + deployed.

### Phase 3 — Security rules rewrite (the safety net)
- `firestore.rules` + `storage.rules`: add `isPlatform()` and shop-scoping so an admin can only read/write docs where `resource.data.shopId == their shopId`; platform bypasses. This is what makes scoping *enforced*, not just *filtered*. Heavy review + a rules test pass before deploy.

### Phase 4 — Platform role + Super Admin UI
- Add `platform` role + `PlatformRoute` guard. Extend `syncAdminClaims` for the new claim/shopId.
- **Super Admin page** (`/admin/platform`, NORD-styled), gated to `platform`:
  1. **List all shops** — table: name, owner, status, created, basic counts.
  2. **Kill switch** — toggle `shops/{shopId}.status`; disabled shop → storefront shows "unavailable" + that shop's admin locks (enforced in ShopContext + rules).
  3. **Provision shop** — create `shops/{shopId}` + owner user + seed config, no manual Firebase.
  4. **Impersonate** — enter any shop's admin (reuse the URL-param impersonation pattern + banner).

### Phase 5 — Per-shop SEO/OG (the earlier deferred item)
- Folds in naturally once config is per-shop: SEO/OG read from `shops/{shopId}` at runtime.

---

## Risks & how the plan manages them

- **Cross-shop data leak (the big one):** mitigated by doing rules (Phase 3) as a hard gate, not relying on query filters alone; + a dedicated verifier pass that tries to read across shops.
- **Order webhook:** server-side, must stamp shopId from the payment metadata — verified in isolation before Phase 1 ships.
- **Big mechanical surface (Phase 2):** batched by area, build+verify each batch; composite-index errors caught at build/runtime.
- **Backfill migration:** one-time, scripted, reversible-by-field; Mikael runs it, not auto.
- **No deploy/migration without explicit go** (STOP-and-surface class throughout).

---

## Open questions for Mikael — ANSWERED (2026-06-14)

1. **Shop identity routing → PATH PREFIX.** `shop-meteorpr.web.app/{shopId}/{countryCode}/...` (e.g. `/sillmans/se/product/...`). shopId is a new path segment inserted BEFORE the existing country code. No DNS/wildcard work needed. (See "Routing implications" below — this is the highest-bug-risk part.)
2. **First real second shop → BUILD MACHINERY FIRST.** Complete Phases 0–4 with only the default shop, fully verified end-to-end, THEN provision real shops (Sillmans) via the Super Admin Provision flow. No real second-shop data enters before the rules gate (Phase 3) lands.
3. **Super Admin v1 → ALL 4 FEATURES** in the first cut: List, Kill-switch, Provision, Impersonate.
4. **Billing → MANUAL KILL SWITCH ONLY.** v1 = `shops/{shopId}.status: 'active'|'disabled'` toggle in Super Admin. `paidUntil` may exist as a stored field but nothing auto-disables. Defer Stripe-subscription automation.

## Routing implications (path-prefix decision — audited 2026-06-14)

Confirmed against the code:
- **Shop vs admin** split (App.jsx:121-132) keys off the *hostname subdomain* (`shop`/`shop-*` → shop, else admin). UNCHANGED by path-prefix; shopId lives in the path, not the host.
- **Current shop routes** (App.jsx:181-220) are `/:countryCode/...` (countryCode ∈ se/gb/us, validated by `CountryRouteValidator` + `isValidCountryCode`). Path-prefix inserts `/:shopId` BEFORE `:countryCode` → `/:shopId/:countryCode/...`.
- **THE BUG RISK — URL helpers read `segments[0]` as country.** `src/utils/productUrls.js` has 3 helpers — `getCountryAwareUrl`, `getProductUrl`, `generateAffiliateLink` — that derive the country code from `window.location.pathname.split('/').filter(Boolean)[0]`. ~70 call sites depend on these. Inserting shopId at `[0]` shifts country to `[1]`; if not fixed in lockstep, EVERY internal link breaks. **Resolution: a `ShopContext` resolves shopId once from the path; the 3 helpers prepend shopId + read country from `[1]`. The 70 call sites stay unchanged.**
- **Config seam confirmed one-line:** `src/config/shopConfig.js:18` — `shopConfigRef` already takes (ignores) a `shopId` arg and returns `doc(db,'settings','app')`. Phase 0 changes it to `doc(db,'shops',shopId)` and threads shopId from `StoreSettingsContext` (which today calls `loadShopConfig()` with no arg). 4 call sites total, all behind the seam.
- **Impersonation pattern to reuse:** URL params `admin_access`/`admin_code` created in AdminAffiliateEdit.jsx:595-605, read + yellow "Admin-läge" banner rendered in AffiliatePortal.jsx:116-164/735-766. Super-Admin→shop impersonation reuses this shape.
