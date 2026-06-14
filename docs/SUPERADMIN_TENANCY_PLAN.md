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

### Phase 0 — Shop resolution + `shopId` context (no data change yet)
- Add `shops/{shopId}` collection + seed ONE shop doc ("b8shield") absorbing current `settings/app`.
- Add a `ShopContext` that resolves the current shopId (from subdomain→`shops.domains`, fallback to the single default). The whole app reads `shopId` from context.
- `shopConfig` seam switches from `settings/app` → `shops/{shopId}` (one-file change, by design).
- **No scoping enforced yet** — everything still works single-shop. Reversible, safe.

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

## Open questions for Mikael (before Phase 0)

1. **Shop identity routing:** how does a visitor's URL map to a shop? Options: (a) subdomain per shop (`sillmans.b8shield.com`), (b) path prefix, (c) custom domains stored in `shops.domains`. Affects Phase 0 resolution.
2. **First real second shop:** is Sillmans the first tenant to provision after b8shield, or build the machinery first and provision later?
3. **Scope of v1 Super Admin:** all 4 features in the first cut, or ship List + Kill-switch first (highest value: see shops + enforce payment), then Provision + Impersonate?
4. **Billing:** is `paidUntil`/Stripe-subscription auto-disable in scope now, or just the manual kill switch for v1?
