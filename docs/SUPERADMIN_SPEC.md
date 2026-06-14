# Super Admin Control Center — Spec

**Status:** SPEC for review (Mikael, 2026-06-14). No code beyond foundation (isPlatform in AuthContext + PlatformRoute guard — already committed).
**Vision (Mikael's words):** a separate platform surface to manage ALL shops: add users, set branding/base colors, activate features as add-ons (e.g. affiliate is opt-in), view statistics, handle invoicing, etc. The platform operator (Mikael) runs the whole multi-tenant SaaS from here; each shop is a tenant on a plan.
**Separation decision:** a separate PAGE inside the admin app at `/admin/platform`, gated by `PlatformRoute` (platform claim). Security isolation is already enforced by Phase 3 rules; this is the operator console on top. (Can graduate to its own subdomain later with no rework.)

---

## Grounding (current state — audited 2026-06-14)
- `shops/{shopId}`: `{ storeIdentity{...branding}, status:'active'|'disabled', name, ownerUid, createdAt }`. Read by StoreSettingsContext via the shopConfig seam.
- Per-shop branding already editable in **AdminStorefront** (accent/logo/hero/story/gallery/blocks) + **AdminSettings** (name/legal/contact/social). These write `shops/{id}.storeIdentity`.
- **Feature-flag precedent EXISTS:** `userWagonSettings/{userId}.wagons.{id}={enabled}` toggles wagon admin tools per user, surfaced by the wagon registry in AppLayout. Same shape works per-shop.
- **Affiliate feature touchpoints (~12)** to gate when `features.affiliate=false`: storefront routes (`/se/affiliate-registration|login|portal`), ShopNavigation links (login/apply), checkout discount + AffiliateTracker click logging, admin nav item + pages (`/admin/affiliates*`), functions (`validateDiscountCode`, `logAffiliateClickV2`, `approveAffiliate`).
- **Users:** `users/{uid}` now has `shopId`+`role`+`platform`+`active`. Created via `createUserProfile` (client) / `createAdminUserV2` (fn, Auth user). `getAllUsers()` is unscoped today.
- **Stats:** AdminDashboard + AdminAffiliateAnalytics compute single-shop stats; reusable as per-shop queries (`where('shopId','==',id)`).
- **Invoicing (platform→shop): greenfield.** Only `affiliatePayouts` (shop→affiliate) exists.

---

## Target data model additions

```
shops/{shopId}
  ├─ storeIdentity {...}            ← exists (branding)
  ├─ status: 'active'|'disabled'    ← exists (kill switch)
  ├─ name, ownerUid, createdAt      ← exists
  ├─ plan: 'free'|'basic'|'pro'     ← NEW (billing tier; drives default features)
  ├─ features: {                    ← NEW (per-shop add-on flags)
  │     affiliate: bool,
  │     campaigns: bool,
  │     dining: bool,
  │     ambassador: bool,
  │   }
  ├─ billing: {                     ← NEW (invoicing)
  │     email, orgNumber, paidUntil, notes
  │   }
  └─ platformNotes: string          ← NEW (operator-only)

platformInvoices/{invoiceId}        ← NEW collection (platform → shop)
  { shopId, number, issueDate, dueDate, amount, currency,
    lineItems:[{desc,qty,unit,amount}], status:'draft'|'sent'|'paid'|'overdue',
    pdfUrl?, createdBy }
```
Rules: `shops` already platform-write (Phase 3). `platformInvoices` = platform-only read/write (add a rules block). `features`/`plan`/`billing` live ON the shop doc → covered by existing shops rules (platform writes; shop-admin can read own).

**Feature-flag enforcement:** a `useShopFeatures()` hook reads `shops/{shopId}.features`; storefront + admin gate UI on it; functions check it server-side before privileged actions (defense in depth). Default-on for the existing shop so nothing breaks; new shops default by `plan`.

---

## Phased build order (each slice: build → verify → commit → deploy on your go)

**Slice 4.1 — Platform console shell + Shop List + Kill-switch.**
- `/admin/platform` (PlatformRoute), NORD-styled, "Platform" nav item shown only to platform.
- Table of all shops: name, status, plan, owner, created, basic counts (orders/products/customers via per-shop count queries). Toggle `status` active/disabled (kill switch). Disabled shop → storefront shows "unavailable" + that shop's admin locks (enforce in ShopContext + a rules check on status).
- Smallest useful slice; proves the console + the highest-value ops (see shops + enforce).

**Slice 4.2 — Feature-flag model + affiliate as the first add-on.**
- Add `features` to shop doc + `useShopFeatures()` hook (default-on for existing shop).
- Super Admin per-shop toggles (affiliate/campaigns/dining/ambassador).
- Wire `features.affiliate` through the ~12 touchpoints: hide storefront affiliate routes/nav, hide admin affiliate nav+pages, skip click logging, and guard the affiliate functions server-side. This is the "activate functions as add-ons" core.

**Slice 4.3 — Provision a new shop.**
- Form: shopId (validated/unique), name, accent/branding seed, plan → creates `shops/{id}` with chosen features. Optionally create/assign an owner user (calls `createAdminUserV2` to make the Auth user + `users` doc with that shopId; re-sync claim).
- Lets you stand up the demo shops you mentioned.

**Slice 4.4 — Per-shop users management.**
- Scope `getAllUsers()` by shopId; Super Admin lists/adds/removes users per shop (role within that shop). Add-user reuses createAdminUserV2 + claim sync.

**Slice 4.5 — Per-shop stats.**
- Aggregate the existing stat queries per shop (orders/revenue/customers/affiliate). Dashboard cards per shop + a platform-wide rollup.

**Slice 4.6 — Invoicing (platform → shop).** (Largest; likely its own phase.)
- `platformInvoices` collection + rules; create/list/mark-paid; PDF generation + email via the existing orchestrator; optional Stripe-subscription tie-in to `paidUntil` (was deferred in the tenancy plan — manual first).

**Later / dependencies:** Slice 4.3+ for REAL second shops also wants Phase 0b (path-prefix URLs + storage path partitioning) so two live shops have distinct URLs and isolated storage. Demo shops can exist as data before that; distinct public URLs need 0b.

---

## Open questions for Mikael (before Slice 4.1)
1. **Build order:** start with Slice 4.1 (console + list + kill-switch) as the first concrete page? (Recommended — smallest, highest value, unblocks the rest.)
2. **Feature defaults by plan:** do you want named plans now (free/basic/pro with preset feature sets), or just per-shop manual toggles for now and plans later? (Recommended: manual toggles first; formalize plans when billing lands.)
3. **Provision owner user:** when you provision a shop, create an owner login immediately, or create the shop first and add users in a later step? (Affects Slice 4.3 vs 4.4 ordering.)
4. **Demo shops & URLs:** the demo shops you want — are they for your own testing (data-only, fine now) or to show prospects at distinct URLs (needs Phase 0b first)?
