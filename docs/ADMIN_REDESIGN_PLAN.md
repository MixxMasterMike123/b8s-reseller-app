# Admin Redesign — IA + Design Plan (Shopify-style, minimalist, workflow-first)

**Status:** PLAN for Mikael's approval. No code until approved (working-method rule 6).
**Author session:** 2026-06-15, after product-model v2 shipped + live.
**Direction anchor:** memory `admin-redesign-direction` (thread #1, PRIMARY).
**Brand:** meteorpr only; `b8shield` is an internal data key (never user-visible).
**Constraint:** keep product-model v2 intact (category + embedded variants + tags + b2cPrice/basePrice + availability.b2c). No data migration.

---

## 0. Decisions locked with Mikael (2026-06-15)

| # | Decision | Choice |
|---|----------|--------|
| 1 | First slice scope | **Orders + Products first** — full IA below, but first BUILT surfaces = Orders list, Order detail, Products list, Product edit (the screenshotted Shopify surfaces). |
| 2 | Visual language | **Shopify-style neutral admin** — a NEW neutral grayscale admin token set, distinct from storefront NORD. Per-shop accent = small touch only (pills/links/primary button), never a theme. |
| 3 | Add-on rails (P4.5) | **Add-on-aware redesign** — leave clean, gate-able seams for B2C + upload-to-print; build the P4.5 entitlement rails as their OWN later slice (threads #2/#3), not in this redesign. |

**Working method in force throughout:** read before edit; build after every change; verify the specific claim; double/triple + inverse-audit; **mandatory bidirectional admin↔shop cross-check** on anything crossing the seam; one orchestrator + read-only verifier subagents adversarially reviewing each diff before commit; commit AND push together; never deploy without Mikael's explicit go; verify live at origin.

---

## 1. Why this redesign (the problem, stated)

The current admin (`AppLayout` + 24 `Admin*` pages) works but is **busy**: blue/gray Tailwind defaults, dense multi-label table cells ("Datum:"/"Belopp:" prefixes), per-page bespoke layouts, no shared list/detail grammar. Shopify's admin is more *effective* because it is more *minimalist and consistent*: every list page shares one grammar (KPI strip → filter bar → calm table with status pills), every detail page shares one grammar (primary workflow card on the left, metadata in a right rail). The win is **workflow-first consistency**, not decoration.

This plan moves our admin toward that grammar while preserving every existing capability and the v2 data model.

---

## 2. Current admin surface (audited inventory)

Shell: `src/components/layout/AppLayout.jsx` (498 lines) — fixed 256px left sidebar, blue accent, 10 nav items + AI-wagon section, top bar (notifications/dark-mode/lang/user pill), impersonation banner mount.

Routes: `src/App.jsx` admin branch (~lines 254–441), all wrapped `<AdminRoute>`, all under `/admin`.

| Section | Route | Page file | Lines | Redesign priority |
|---|---|---|---|---|
| Dashboard | `/admin` | AdminDashboard.jsx | 537 | P2 (home) |
| **Orders list** | `/admin/orders` | AdminOrders.jsx | 708 | **P1 — slice 1** |
| **Order detail** | `/admin/orders/:orderId` | AdminOrderDetail.jsx | 807 | **P1 — slice 1** |
| **Products list** | `/admin/products` | AdminProducts.jsx | 265 | **P1 — slice 1** |
| **Product edit** | (modal in AdminProducts) | ProductForm.jsx | ~530 | **P1 — slice 1** |
| Admins | `/admin/users` (+create/edit) | AdminUsers / AdminUserCreate / AdminUserEdit | 448/656/1426 | P3 |
| B2C customers | `/admin/b2c-customers` (+detail) | AdminB2CCustomers / …Edit | 444/869 | P2 |
| Storefront branding | `/admin/storefront` | AdminStorefront.jsx | 566 | P3 (already NORD-styled) |
| Marketing | `/admin/marketing` (+edit, +customer) | 4 files | 464/421/477/427 | P3 |
| Pages (CMS) | `/admin/pages` (+edit) | AdminPages / AdminPageEdit | 388/594 | P3 |
| Affiliates | `/admin/affiliates` (+create/analytics/edit/payout) | 5 files | 399/452/647/1420/424 | P3 (gate behind add-on later) |
| Settings | `/admin/settings` | AdminSettings.jsx | 589 | P2 |

Reusable admin components today: `ProductForm`, `PickupLocationsEditor`, `FileUpload`, `FileManager`, `SortableImageGallery`, `OrderStatusMenu`.

**Tokens today:** `src/index.css` Tailwind v4 `@theme`. Admin uses `primary-*` (sky-blue scale) + raw `gray-*`/`white`. NORD tokens (`canvas`/`ink`/`ink-muted`/`accent`) are storefront-only. **There is no admin design system** — each page restyles inline. That absence is the opportunity.

---

## 3. Target visual system — "Admin Neutral" (Shopify-spirit)

A small, shared token + primitive layer. NOT a copy of Polaris; our own neutral take in Shopify's spirit. Lives alongside (not replacing) NORD.

### 3.1 Tokens (new, added to `src/index.css` `@theme`, `admin-` prefixed to avoid NORD collision)
```
--color-admin-bg:        #F1F1F1   /* app canvas (cool light gray, Shopify-like) */
--color-admin-surface:   #FFFFFF   /* cards/tables */
--color-admin-surface-2: #FAFAFB   /* table header / subtle fill */
--color-admin-border:    #E3E3E3   /* hairline borders */
--color-admin-text:      #1A1A1A   /* primary text */
--color-admin-text-muted:#616161   /* secondary */
--color-admin-text-faint:#8A8A8A   /* labels/meta */
--color-admin-primary:   <per-shop accent>  /* primary button/links — reads the shop accent at runtime */
--radius-admin:          10px      /* cards (calmer than NORD's 22px) */
--radius-admin-el:       8px       /* inputs/pills */
--shadow-admin:          0 1px 0 #0000000D, 0 1px 3px -1px #0000001A  /* flat, Shopify-flat */
```
Dark mode: keep the existing `.dark` support; add `admin-*` dark values. (Shopify admin is light-first; dark is a nice-to-have we already have, so we won't drop it.)

Per-shop accent: `--color-admin-primary` resolves to the shop's `storeIdentity.accent` (same source StoreSettingsContext already injects for NORD). Accent appears ONLY on: primary buttons, active nav item, links, focus rings, and the "selected" state — never as a background wash. Status pills stay semantic (see below), independent of accent.

### 3.2 Status pill palette (semantic, Shopify-style — replaces the current 6 ad-hoc maps)
One shared `<StatusPill>` primitive, two visual weights:
- **Payment:** Paid → green-subtle; Pending → yellow-subtle; Refunded/Failed → gray/red-subtle.
- **Fulfillment:** Fulfilled → green; Unfulfilled → yellow-subtle (Shopify's exact pattern); Partially → orange; Cancelled → red.
- **Order status** (our existing pending/confirmed/processing/shipped/delivered/cancelled) maps onto the same pill primitive — consolidating the duplicated `getStatusStyles`/`getStatusLabel` maps currently copy-pasted across AdminOrders, AdminOrderDetail, OrderStatusMenu.

### 3.3 Shared admin primitives (new `src/components/admin/ui/`)
Built once, used by every redesigned page — this is what makes it "consistent" not "restyled":
- `Page` — page frame: title row (title + primary/secondary actions), optional back-link, max-width container, consistent padding.
- `KpiStrip` — the top metric cards on list pages (Orders / Items / Returns / Fulfilled…). Props: array of `{label, value, delta?, spark?}`. Degrades gracefully (`–`) like the existing count code.
- `DataTable` — calm table: column defs, row click, selection checkboxes, empty state, loading skeleton. Replaces the 4 bespoke `<table>`s.
- `FilterBar` — search + tab/segmented filters (the "All / source / status" controls), one component.
- `Card` / `CardSection` — surface + hairline + header. The right-rail metadata blocks are just stacked Cards.
- `RightRail` — the detail-page two-column grid (main + 320px rail).
- `StatusPill`, `Button` (primary/secondary/plain/destructive), `Field` (label+input+help), `Toolbar`.

No third-party UI lib (constraint: pure-model design, no gstack/frontend-design skills). Heroicons stays (already used).

---

## 4. Target IA (information architecture)

### 4.1 Sidebar nav — regroup toward Shopify's order
Shopify's nav order is workflow-frequency-first: **Home · Orders · Products · Customers · Marketing · Discounts · Content · Analytics · Settings**. Our equivalent, keeping every existing destination:

```
Hem            /admin                  (Dashboard)
Ordrar         /admin/orders           ← high frequency, moves up
Produkter      /admin/products
Kunder         /admin/b2c-customers    (B2C; "Kunder")
Marknadsföring /admin/marketing
Innehåll       /admin/pages            (CMS "Sidor" → "Innehåll")
Butik          /admin/storefront       (storefront appearance)
Affiliates     /admin/affiliates       (← becomes add-on-gated later, thread #2)
Administratörer/admin/users            (platform/admin users — lower, settings-adjacent)
Inställningar  /admin/settings
── AI Vagnar ──  (unchanged, dynamic from WagonRegistry)
```
Changes are **label + order only** in slice 1's shell pass; no routes move (zero 404 risk). Affiliate-gating and any route changes are deferred to their own slices.

### 4.2 List-page grammar (every list page converges to this)
```
[ Page title ............................. (primary action) ]
[ KpiStrip: metric · metric · metric · metric ]
[ FilterBar: search ......... | segmented filters | column toggle ]
[ DataTable: selectable rows · status pills · right-aligned actions ]
```
Orders list KPIs (from Shopify ref): **Ordrar · Artiklar · Att hantera (unfulfilled) · Levererade**. Computed from the already-loaded `orders[]` (no new queries) — verify each against existing data before claiming.

### 4.3 Detail-page grammar (every detail page converges to this)
```
[ back · #orderNumber · status pills ............ (actions ⋯) ]
┌───────────────────────────────┬───────────────────┐
│ MAIN (primary workflow)       │ RIGHT RAIL        │
│  • Fulfillment card           │  • Notes          │
│    (line items + action btn)  │  • Customer       │
│  • Payment summary card       │  • (Conversion)   │
│                               │  • Tags           │
└───────────────────────────────┴───────────────────┘
```

---

## 5. Slice 1 (build now, on approval): Orders + Products — page-by-page from→to

### Slice 1a — Admin Neutral foundation (no page behavior change)
1. Add `admin-*` tokens to `src/index.css` `@theme`.
2. Build `src/components/admin/ui/` primitives (§3.3) with no callers yet (pure additions, safe to build + Storybook-free smoke via temporary mount, then wire).
3. Wire `--color-admin-primary` to the existing accent source (confirm StoreSettingsContext path used by NORD).
- **Verify:** build passes; primitives render; existing pages untouched (no import yet).
- **admin↔shop cross-check:** N/A (no field seam touched).

### Slice 1b — Orders list (`AdminOrders.jsx`)
- **From:** 4 fat cells with inline labels, 6-color ad-hoc status map, source+status tab rows, search, CSV/verification/label actions in a bespoke header, B2B-only total footer.
- **To:** `Page` + `KpiStrip` (Ordrar/Artiklar/Att hantera/Levererade) + `FilterBar` (search + source segmented + status segmented + selection) + `DataTable` with Shopify-like columns: **Order · Datum · Kund · Betalning(pill) · Status(pill) · Leverans (pickup/home) · Artiklar · Belopp**. Row → order detail. Keep ALL existing actions (CSV export, verification PDFs, bulk label print, OrderStatusMenu) — relocated into the new toolbar/row-action slots, not removed.
- **Behavior preserved (must verify, not assume):** source/status filtering, search matching (orderNumber/user/customerInfo/company), affiliateClicks batch fetch, sort desc, B2B total, shopId scoping (`useShopId` + `where('shopId')`).
- **New surface from existing data:** "Leverans" column reads `order.deliveryMethod`/`order.pickupLocation` (already stamped by stripeWebhook — see product-and-delivery memory). Verify present before rendering; fallback "—".

### Slice 1c — Order detail (`AdminOrderDetail.jsx`)
- **From:** single full-width white card, "B8Shield Order Details" title (brand string — must neutralize), stacked Customer/Order/Delivery/Items sections, actions in header.
- **To:** `RightRail` layout. MAIN = Fulfillment card (line items with variant labels + delivery/pickup context + status action via OrderStatusMenu) + Payment summary card (subtotal/shipping/VAT/total, "Paid" pill). RAIL = Notes (order.note), Customer (info + address, B2B userData / B2C customerInfo branch preserved), Tags. Header = back + #orderNumber + payment/fulfillment pills + actions menu (Print, Label, Delete).
- **Brand fix:** "B8Shield Order Details" → neutral "Order {orderNumber}" (inverse-audit: grep this file + siblings for any other brand strings).
- **Behavior preserved (verify):** status update flow (updateOrderStatus → refetch → toast), print/label HTML generation, delete-with-confirm, B2B-vs-B2C customer/address branching, `getEnhancedOrderDistribution` items incl. variant labels (v2).

### Slice 1d — Products list (`AdminProducts.jsx`)
- **From:** shop-scoped table + category/tag filter + inline delete + ProductForm modal.
- **To:** `Page` + (light) `KpiStrip` (Produkter / Aktiva / Utkast(if status) / Lågt lager(only if we track stock — we do NOT today, so omit, don't fake) ) + `FilterBar` (search + category filter) + `DataTable`: **Produkt(thumb+name) · Status(pill) · Kategori · Pris · Varianter(count) · Synlig(availability.b2c)**. Row → edit. Keep create/delete.
- **Honesty rule:** no Inventory column (we don't track stock — Shopify ref shows it but we'd be faking). Note the gap; don't invent data.

### Slice 1e — Product edit (`ProductForm.jsx`)
- **From:** single monolithic form, all fields stacked.
- **To:** Shopify product-edit grammar via `RightRail`. MAIN = Title · Description · Media · Price · Variants (the v2 `hasVariants`/`variants[]` editor — unchanged logic) · Shipping. RAIL = Status (Aktiv/Utkast via isActive) · Publishing/visibility (`availability.b2c` toggle — **this is the seam for the future B2C add-on; leave it cleanly gate-able**) · Organization (Kategori `category` + Tags `tags[]`).
- **v2 invariants preserved (verify each):** one price field writes BOTH `b2cPrice` + `basePrice`; `availability.b2c` defaults true (a product without it VANISHES from storefront); variants embedded `{sku,label,price,image?}`; `plainText()` read-compat; category read-fallback `category||group`.
- **🔁 admin↔shop cross-check (MANDATORY here):** for every field this form writes, confirm the storefront (`PublicStorefront`/`PublicProductPage`/`CollectionPage`/`CartContext`) reads + renders it; and every storefront-rendered product attribute is editable here. Diff the ProductForm write-surface against the storefront read-surface, both directions. Surface any mismatch instead of shipping.

### Slice 1f — Shell pass (`AppLayout.jsx`)
- Re-skin sidebar to Admin Neutral (calm surface, accent only on active item), relabel + reorder nav per §4.1 (labels/order only, no route changes), top bar to neutral. Impersonation banner + wagon section preserved exactly.
- **Verify:** every nav link still resolves; impersonation banner still mounts + counts down; dark mode intact; mobile menu intact.

**Each slice:** build → adversarial read-only verifier review of the diff (design fidelity + behavior preservation + admin↔shop) → fix flags → commit AND push together. No deploy until Mikael's explicit go; then verify live bundle hash at origin.

---

## 6. Add-on seams left for threads #2/#3 (no rails built now)

The redesign deliberately leaves these clean homes so P4.5 entitlements drop in later without re-surgery:
- **B2C add-on (thread #2):** the Product edit "Publishing/visibility" rail card is where a `features.b2c` gate will live; the storefront `where('availability.b2c','==',true)` query is the second gate point. Redesign keeps `availability.b2c` as a first-class, isolated toggle — easy to wrap in `featureEnabled('b2c')` later.
- **Upload-to-print add-on (thread #3):** Product edit MAIN column gets a reserved slot (after Media) where a print-spec/upload section will mount under `featureEnabled('uploadToPrint')`. Order detail Fulfillment card has room for an "uploaded artwork" block. No code now — just an acknowledged insertion point.
- **Entitlement rails themselves (P4.5):** `useShopFeatures()` hook + platform Features tab + gating — their OWN slice AFTER slice 1, per decision #3. `shops/{id}.features` is already seeded by ProvisionShopModal (dead data today); the hook will give it life.

---

## 7. Risk + non-goals

**Risks & mitigations:**
- *Behavior regression in high-traffic pages (Orders).* → per-slice read-only verifier diff against a written behavior-preservation checklist; live verify after deploy.
- *Brand strings* ("B8Shield Order Details").* → inverse-audit grep of the whole admin surface, not just touched files.
- *Accent misuse* (accent as background → garish per shop). → accent restricted to button/active/link/focus by token discipline; reviewer checks.
- *Faking data we don't have* (Shopify shows Inventory/Conversion/Risk). → honesty rule: render only real data; note gaps; never invent.
- *Touching v2 model.* → invariants list in §5e; admin↔shop cross-check mandatory.

**Non-goals (this plan):** inventory tracking, discounts engine, analytics charts, i18n admin, staff-role gradations, the P4.5 entitlement rails, threads #2/#3 features themselves. All explicitly deferred.

---

## 8. Proposed sequence (after approval)

1. **Slice 1a** Admin Neutral tokens + primitives (no page change).
2. **Slice 1b** Orders list.
3. **Slice 1c** Order detail.
4. **Slice 1d** Products list.
5. **Slice 1e** Product edit (ProductForm) — with mandatory admin↔shop cross-check.
6. **Slice 1f** Shell/nav pass.
7. Review pass across all of slice 1 (cross-cutting consistency), then **STOP for Mikael's deploy go**; verify live.
8. *(Later, separate)* P4.5 entitlement rails → thread #2 (B2C add-on) → thread #3 (upload-to-print).

Then P2 (Dashboard home, Customers, Settings) and P3 (the rest) converge to the same grammar in subsequent slices.

---

*Plan only. Awaiting Mikael's approval + any scope edits before slice 1a.*
