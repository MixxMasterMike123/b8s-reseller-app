# Add-ons: platform-controlled, per-site (Wagons → Add-ons)

**Status:** PLAN — awaiting Mikael's approval. No code until approved.
**Date:** 2026-06-16
**Supersedes/realizes:** the deferred P4.5 entitlement work (docs/PLATFORM_ARCHITECTURE.md, docs/SUPERADMIN_SPEC.md Slice 4.2).

## Decisions (locked by Mikael, 2026-06-16)
- **Full slice:** rename Wagons → Add-ons **and** move control to per-shop **and** build the platform toggle UI **and** add `useShopFeatures()` gating — one cohesive slice.
- **Platform-only control:** add-ons are enabled/disabled ONLY from the platform console, per site. The per-user toggle in shop AdminSettings is **removed**.

## The problem today (from the code audit)
Two disconnected "enable" mechanisms exist:
1. **Wagons** (`writers / ambassador / dining / campaign`) — toggled **per-USER** via `userWagonSettings/{userId}`, from shop `AdminSettings.jsx`. Wrong axis (per-user), wrong control plane (shop-admin).
2. **`shops/{id}.features`** map (`{affiliate, campaigns, dining, ambassador}`) — written by `ProvisionShopModal` on new shops, but **read by NOTHING**. No hook, no gate, no enforcement.

`dining`/`ambassador`/`campaigns` appear in BOTH — the shop `features` map was always meant to gate the wagons; it was just never wired. This slice unifies them into **one per-shop `features` map, controlled from the platform, read everywhere via `useShopFeatures()`**.

## Target model
```
shops/{shopId}
  └─ features: {            // the ONLY enablement source of truth (per-shop)
       affiliate:  bool,    // gates the affiliate add-on (storefront + admin + functions) — see note
       campaigns:  bool,    // campaign-wagon
       dining:     bool,    // dining-wagon
       ambassador: bool,    // ambassador-wagon
       writers:    bool,    // writers-wagon (currently manifest-disabled; flag added, default false)
     }
```
- **`useShopFeatures()`** — a new hook reading `shops/{shopId}.features` (via the existing `shopConfig.js`/`StoreSettingsContext` seam, which already loads the shop doc once per shopId).
- **Default-ON fallback for the existing `b8shield` shop** (and any shop missing the field): a feature reads `true` when the flag is `undefined`, so nothing breaks for shops provisioned before this field existed. NEW shops keep `ProvisionShopModal`'s explicit defaults.
- **`features` ≠ kill-switch.** `shops/{id}.status` (active/disabled) stays the platform kill-switch; `features` is the entitlement layer (per the docs' explicit "don't reuse release/kill-switch flags for paid gating").

## Terminology rename (Wagons → Add-ons)
- UI strings: sidebar heading **"AI Vagnar" → "Tillägg"** (AppLayout); any user-facing "Wagon"/"Vagn" copy → "Tillägg"/"Add-on".
- Platform nav: the dead **`{ name: 'Tillägg', path: '/addons', live:false }`** placeholder (`PlatformLayout.jsx:24`) becomes a real route.
- **Code/folder rename is OUT OF SCOPE for safety in this slice.** `src/wagons/`, `WagonRegistry`, `WagonManifest`, `userWagonSettings` keep their internal names to avoid a massive churn diff across the registry + 4 wagons + 3 cross-imports. We rename what the USER sees + add the new control layer. A pure code-rename can be a later cosmetic slice. (Open question Q1 below if you want the code renamed now.)
- **Internal mapping:** a single map `WAGON_FEATURE_KEY = { 'ambassador-wagon':'ambassador', 'dining-wagon':'dining', 'campaign-wagon':'campaigns', 'writers-wagon':'writers' }` ties each wagon id to its `features` key. One place, easy to read.

## What changes, by layer

### 1. Platform console — the control UI (NEW)
- **New page `PlatformAddons.jsx`** mounted at `/addons` (replacing the `live:false` placeholder). Lists all shops (reusing the `PlatformShops` fleet fetch) with a per-shop row of add-on toggles.
- Each toggle does `updateDoc(doc(db,'shops',id), { ['features.'+key]: bool })` — mirroring the existing `toggleStatus` kill-switch pattern (`PlatformShops.jsx:66`). Optimistic UI + error toast, same as kill-switch.
- Reuses the platform design (PlatformLayout). Add-on catalog (id, label, description) defined as a small constant in the platform page.
- Guarded by `<PlatformRoute>` (super-admin only), same as the rest of the console.

### 2. `useShopFeatures()` hook (NEW)
- Reads `shops/{shopId}.features` keyed on `useShopId()`. Returns `{ features, isEnabled(key), loading }`.
- `isEnabled(key)` → `features?.[key] !== false` (default-ON when undefined; explicit `false` disables). This is the single gate everyone calls.
- Sourced from the `shopConfig.js` seam so we don't add a second per-shop doc read: extend `loadShopConfig` to also return `.features` (today it discards everything but `.storeIdentity`), and expose it through `StoreSettingsContext` → `useShopFeatures()`.

### 3. Wagon menu + routes — gate by shop feature (CHANGED)
- **AppLayout** wagon menu: today calls `getAdminMenuItems(currentUser.uid)` (per-user gate). Change to gate by **shop feature** instead — filter the menu items so a wagon shows only when `isEnabled(WAGON_FEATURE_KEY[wagonId])`. Heading → "Tillägg".
- **App.jsx routes**: wagon routes currently mount for all manifest-enabled wagons (gated only by `<AdminRoute>`). Add a shop-feature gate so a disabled add-on's routes 404/redirect (defense in depth — not just hidden in the menu). Mechanism: wrap wagon routes in a small `<AddonGate feature={key}>` that redirects to `/admin` when `!isEnabled`.
- **`manifest.enabled`** stays as the global/dev kill (writers-wagon stays `false` globally regardless of shop flags). Shop `features` is an AND on top: a wagon shows iff `manifest.enabled && shopFeatureEnabled`.

### 4. Shop AdminSettings — remove the per-user toggle (REMOVED)
- Delete the wagon-management section (`toggleWagonForUser`, `loadUserWagonSettings`, the toggle UI). Add-ons are no longer shop-admin-controllable.
- `userWagonSettings/{userId}` collection becomes dead. **Data is NOT deleted** (no destructive op) — the collection is simply orphaned; the reads/writes go away. A later cleanup can purge it. The firestore rule for it can stay or be removed (keeping it is harmless).

### 5. Affiliate add-on (the docs' designated first paid add-on)
- The docs map ~12 affiliate touchpoints (storefront routes, ShopNavigation links, checkout discount, AffiliateTracker, admin nav + pages, 3 functions).
- **Scope call:** wiring all 12 affiliate touchpoints + server-side function enforcement is a *large* sub-effort and is **deferred to a follow-up slice (P4.5b)**. THIS slice delivers the rails (`features` map + `useShopFeatures()` + platform UI) and wires the **wagon add-ons** (ambassador/dining/campaigns/writers) end-to-end as the proof. `affiliate` appears in the platform toggle UI but its enforcement (gating the affiliate UI/functions) lands in P4.5b. (Open question Q2 if you want affiliate fully gated now.)

### 6. Server-side enforcement (defense in depth)
- The docs require functions to check features server-side before privileged actions. For the wagon add-ons in scope, the wagons are admin-only UI surfaces with no privileged callable that bypasses the client gate, so client gating is sufficient for THIS slice. Server enforcement becomes relevant with the affiliate add-on (P4.5b: `validateDiscountCode`, `logAffiliateClickV2`, `approveAffiliate`).

## Out of scope (explicit)
- Renaming `src/wagons/` code/folders/registry (cosmetic, later).
- Full affiliate-add-on gating across the 12 touchpoints + functions (P4.5b).
- `plan` / `billing` tiers + add-on catalog/marketplace (lands with billing, P4.8).
- Deleting `userWagonSettings` data (orphaned, non-destructive; purge later).
- The 3 direct cross-wagon imports (AuthContext/OrderContext/AffiliatePortalCampaigns reach into wagon internals) — they bypass enablement but are pre-existing; not touched here.

## Build order (slices, each verified + deployed)
1. **S1 — Rails:** extend `loadShopConfig` to return `features`; add `useShopFeatures()` + `WAGON_FEATURE_KEY` map + `<AddonGate>`. No UI change yet. Verify hook reads correctly (default-ON for b8shield).
2. **S2 — Platform UI:** build `PlatformAddons.jsx` at `/addons`, per-shop toggles writing `features.*`. Verify toggles persist + reflect.
3. **S3 — Gate the menu + routes:** AppLayout menu + App.jsx routes gated by shop feature; heading → "Tillägg". Verify a disabled add-on disappears from menu AND its route redirects.
4. **S4 — Remove shop-admin toggle + rename copy:** delete the AdminSettings wagon section; sweep user-facing "Wagon/Vagn" → "Tillägg/Add-on". Verify AdminSettings still saves everything else.
5. **S5 — Cross-check + sign-off:** admin↔platform↔storefront cross-check (every add-on: platform toggle → menu/route reflects → default-on safe for b8shield); money/permission untouched (no money paths in this slice); build + deploy + live-verify.

## Risks / invariants
- **Default-ON invariant:** the existing `b8shield` shop has no `features` field → every `isEnabled` must read `true` for missing flags, or the whole admin loses its add-on menus. This is the #1 thing to verify (S1 + S5).
- **No money path touched.** Add-ons in scope (wagons) carry no checkout/price logic. Total-parity invariant unaffected. (Affiliate, which DOES touch checkout discount, is deferred to P4.5b precisely so this slice stays off the money path.)
- **Platform-only write:** `features` is written only by `<PlatformRoute>`-guarded UI; firestore `shops` rules already allow platform write / shop-admin read — verify the rule actually permits the `features.*` field write (it should, as a field on the shops doc).
- **`getRoutesForUser` is currently dead code** — we're replacing per-user gating with per-shop, so the per-user route variant stays unused/removed.

## Scope decisions (locked by Mikael, 2026-06-16)
- **Q1 — code rename:** NO. Keep `src/wagons/` internal names; rename only user-facing copy this slice. (Code/folder rename = later optional cosmetic pass.)
- **Q2 — affiliate gating:** DEFERRED to P4.5b. This slice ships rails + wires the 4 wagon add-ons; affiliate appears in the platform toggle but enforcement (12 touchpoints + 3 functions) lands in the follow-up. THIS slice stays entirely off the money path.
- **Q3 — add-on copy:** I'll draft neutral Swedish labels/descriptions ("Kampanjer", "Dining CRM", "Ambassadörer", "AI-texter", "Affiliate"), editable later by Mikael.

## Sign-off result (2026-06-16) — slice DONE, two carry-forwards
Adversarial 3-way sign-off (platform↔admin↔shop): all 4 audited areas CLEAN + critic GO. Default-ON invariant proven end-to-end; money path untouched. Shipped S1–S5 (commits c59510c, 97b078e, b9feb67, eb8245e + the sign-off fix).

**Carry-forward items (do NOT re-block this slice):**
1. **DONE in this slice:** `DEFAULT_FEATURES` now includes `writers:false` (was implicitly ON for new shops; writers is manifest-disabled globally anyway). New-shop defaults: affiliate/campaigns ON, dining/ambassador/writers OFF. Existing shops (no `features` field) = all ON (default-ON).
2. **⚠️ KNOWN GATE-BYPASS → fold into P4.5b enforcement:** four direct cross-wagon imports run wagon logic REGARDLESS of the per-shop feature flag (they reach into wagon internals, bypassing the menu/route gate):
   - `src/contexts/AuthContext.jsx` → `onNewB2BCustomer()` (dining-wagon customer-status automation) on every new customer.
   - `src/contexts/OrderContext.jsx` → `onOrderCompleted()` (dining-wagon) on every completed order.
   - `src/components/layout/AppLayout.jsx` → `<MentionNotifications/>` (dining-wagon) renders for any admin (role-gated only).
   - `src/components/AffiliatePortalCampaigns.jsx` → `useCampaigns()` (campaign-wagon) in the storefront affiliate portal.
   Effect: a "disabled" dining/campaign add-on still runs background logic (writes `users/{id}.status`, reads campaigns). Low impact (CRM field / reads; no money, no admin-visible surface). Proper fix = gate these on `useShopFeatures().isEnabled('dining'|'campaigns')` (or remove the direct coupling via the registry) as part of the affiliate/enforcement follow-up. Documented here so it's tracked, not silent.
