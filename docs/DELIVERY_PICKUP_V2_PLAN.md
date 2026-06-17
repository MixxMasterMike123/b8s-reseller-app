# Delivery & Pickup v2 — Per-product delivery modes + pickup dates

**Status:** PLAN — awaiting Mikael's approval. No code until approved.
**Branch:** `salvage/cleanup-and-security` (HEAD `7c519d9`).
**Stakes:** money path (Stripe total-parity), schema/data (product + storeIdentity + order docs), multi-tenant. Plan-first per [[working-method]].
**Method anchor:** every field / function / text below is cross-checked **platform ↔ admin ↔ shop**, all directions. A field saved-but-unread, rendered-but-uncontrollable, or platform-toggled-but-not-reflected = a bug, not a ship.

---

## 1. What Mikael asked for

1. **Per-product delivery modes** — turn **shipping** and/or **pickup** on/off **per product**. (A product may be shipping-only, pickup-only, or both.)
2. **Pickup dates** — Sillmans has **3 specific pickup dates**. Add a date field to the pickup-address/settings model so a shop can publish its available pickup dates.
3. **Pickup-date choice at checkout** — the customer chooses a pickup date during checkout, and checkout reflects the configured pickup locations + their dates.
4. **Persist + confirm** — the chosen pickup location + date must be **saved with the order in the DB** and **shown on the order confirmation** (and admin order view).
5. **Export orders by pickup location, separated by date** — a shop fulfilling pickups needs an operational picklist: "all pickup orders for Location X, grouped/separated by date." (Added 2026-06-17.)

Underlying principle Mikael stated: presenting **both home delivery and local pickup** is a **core feature** for these shops. The checkout must faithfully reflect what the shop configured.

---

## 2. Current state (verified end-to-end this session)

The Click & Collect chain already exists and is live (commit aee1af6 / product-model v2). Verified:

- **Shop config seam:** `shops/{shopId}.storeIdentity.pickupLocations: [{id,name,address,hours}]`, managed by shop admin in `AdminSettings` via `PickupLocationsEditor`, persisted through `saveShopConfig` (`shopConfig.js`, `setDoc({storeIdentity: patch}, {merge:true})`).
- **Storefront read:** `StoreSettingsContext` → `useStoreSettings()` → `Checkout.jsx` reads `store.pickupLocations`; the delivery-method selector renders only when `pickupLocations.length > 0`.
- **Cart state:** `CartContext` holds `deliveryMethod` ('home'|'pickup') + `pickupLocation` (session-only, not persisted — reload resets to home). Pickup zeroes shipping in `calculateTotals`.
- **Money path (TOTAL-PARITY invariant):** `createPaymentIntent.computeOrderTotalsSek` zeroes shipping when `deliveryMethod === 'pickup'` — byte-identical rule to the client. **Any change to shipping/price math MUST change both sides together.**
- **Order stamping:** `StripePaymentForm` flattens `pickupLocation` → `deliveryInfo.pickupLocationId/Name/Address` → PI metadata → `stripeWebhook` stamps `order.deliveryMethod` + `order.pickupLocation: {id,name,address}`.
- **Order display:** `AdminOrderDetail` (fulfillment card), `AdminOrders` (Leverans column), `OrderConfirmation` (customer) all render method + location.
- **Product model v2:** product doc has `shipping.{sweden,nordic,eu,worldwide}.cost`, `weight`, `availability.b2c`, `hasVariants`/`variants[]`, `category`, `tags`. Edited in `ProductForm.jsx`. Storefront product queries filter `where('availability.b2c','==',true)`. Server reprices from the product doc in `computeOrderTotalsSek`.

### Findings from discovery (folded into this plan)

- **F1 — Firestore merge depth (corrected):** `setDoc(ref, {storeIdentity: patch}, {merge:true})` **deep-merges** nested maps but **replaces arrays wholesale** when the array key is present in the patch. `AdminStorefront` saves only `pickBranding(form)` (BRANDING_KEYS, which excludes `pickupLocations`), so saving the Storefront page does **NOT** wipe `pickupLocations`. **No clobber bug. No action needed** — but we add a regression note so a future dev doesn't add `pickupLocations` to BRANDING_KEYS and break it.
- **F2 — `pickupLocation` is NOT gated by the `pickup` add-on / `features` flag.** There is no per-shop `features.pickup` enforcement today; pickup is implicitly "on" whenever `pickupLocations.length > 0`. This plan does **not** add a platform add-on gate for pickup (it's core, not an add-on) — but §7 records the platform-axis cross-check explicitly so we don't leave a seam unconsidered.
- **F3 — Order emails (`orderConfirmation.ts`, `orderNotificationAdmin.ts`) have NO delivery/pickup section at all today, and the email system is BROKEN/SHELVED.** Pickup date in email is **out of scope** here; tracked as a follow-up tied to the email re-architecture.
- **F4 — `labelPrinter.js` has no pickup handling** (uses home address). Out of scope; noted as backlog.
- **F5 — `CustomerAccount.jsx` order history shows no delivery info.** Out of scope (consistent with today); optional later.

---

## 3. Data model changes (additive, no migration)

No live-data migration is needed: all fields are additive with safe defaults that reproduce today's behavior for existing docs.

### 3.1 Product doc — per-product delivery modes

Add ONE map to the product doc:

```js
delivery: {
  shipping: true,   // product can be shipped (home delivery)
  pickup:   true,   // product can be picked up (Click & Collect)
}
```

**Default = both true** → existing products (no `delivery` field) behave exactly as today (read-fallback `delivery?.shipping !== false` / `delivery?.pickup !== false`). Invariant: **at least one mode must be true** — admin validation prevents saving a product with both off (a product no one can receive). We do NOT reuse `availability.b2c` (that's the storefront-visibility filter; orthogonal).

Why a `delivery` map and not two top-level booleans: groups the concept, matches the `availability`/`dimensions`/`shipping` nesting style already in the doc, and leaves room for future modes.

### 3.2 storeIdentity — pickup dates per location

Extend each pickup location:

```js
pickupLocations: [
  { id, name, address, hours, dates: ['2026-07-04', '2026-07-18', '2026-08-01'] }
]
```

- `dates: string[]` of ISO `YYYY-MM-DD`. **Empty / missing `dates` = no specific dates** → checkout shows the location with **no date picker** (today's behavior preserved; pickup still works "any time per hours").
- ISO date strings sort lexically and render locale-formatted on the storefront. No `Timestamp` (avoids the `Date.now()`-in-config concerns and keeps the array a plain JSON value that survives the config seam).

### 3.3 Order doc — chosen pickup date

When `deliveryMethod === 'pickup'` and the customer picked a date, stamp:

```js
order.pickupLocation = { id, name, address, date: '2026-07-18' }  // date added to the existing object
```

Keep it INSIDE `pickupLocation` (not a sibling) so all pickup specifics live in one place and existing readers that null-check `order.pickupLocation` are unaffected. `date` is optional (absent for locations with no configured dates, or old orders).

---

## 4. The seams to touch — full inventory (this is the cross-check matrix)

Each row names the field/function/text and the THREE checks. "✓" = this slice covers it; "n/a" = no surface on that axis.

| # | Field / function / text | PLATFORM | ADMIN (control) | SHOP (render/behavior) |
|---|---|---|---|---|
| A | Product `delivery.shipping` / `delivery.pickup` | n/a (not an add-on; §7) | ProductForm: 2 toggles + validation (≥1 on) | Storefront product page shows available modes; cart/checkout restricts methods; server enforces |
| B | Cart available-delivery-methods (derived from items) | n/a | n/a (derived, not configured) | CartContext computes which methods are allowed for the current cart; Checkout selector only offers allowed ones |
| C | Server enforcement of per-product modes | n/a | n/a | `computeOrderTotalsSek` rejects a charge whose `deliveryMethod` is disabled for any cart item (parity + anti-tamper) |
| D | `pickupLocations[].dates` | n/a | PickupLocationsEditor: dates sub-editor | Checkout: date `<select>` per chosen location |
| E | Order `pickupLocation.date` | n/a | AdminOrderDetail shows date; AdminOrders (optional) | OrderConfirmation shows date |
| F | i18n strings (all new UI text) | n/a | Swedish admin labels (hardcoded, matches file convention) | `t('key','svDefault')` on storefront (matches Checkout convention) |
| G | TOTAL-PARITY (client total == server charge) | n/a | n/a | CartContext.calculateTotals ↔ computeOrderTotalsSek — unchanged math, but BOTH must agree on "is this method allowed" |

**Reverse-check (inverse audit) applied to each:**
- A: is every product toggle READ by the storefront AND enforced by the server? (no toggle that admin sets but checkout ignores) → slices 1+2+4 close this.
- D: does a configured date REACH checkout, get CHOSEN, and land on the ORDER and admin view? (no date that's saved but never selectable, or selectable but never stamped) → slices 3+5+6 close this.
- C/G: can a tampered client (pickup on a pickup-disabled product, or a date for a shipping order) push a bad charge/order through? → server enforcement + stamping rules close this.

---

## 5. Slices (each: build → adversarial verify → commit+push → deploy → live-verify)

Ordered so each slice is independently shippable and the money path is touched with parity proven.

### Slice 1 — Product delivery toggles (admin control + write)
- `ProductForm.jsx`: add a **Delivery** subsection (in/near the Shipping section): two checkboxes "Kan skickas (hemleverans)" and "Kan hämtas (Click & Collect)", both default on. Persist `delivery:{shipping,pickup}` in the saved doc. Validation: block save if both off (toast).
- `formFromProduct`: hydrate `delivery` with `{shipping: p.delivery?.shipping !== false, pickup: p.delivery?.pickup !== false}` (default-on read).
- **Cross-check:** admin→ (slices 2/4 do the shop+server read). No platform axis (A).
- **Verify:** create/edit a product, confirm doc has `delivery`; old product without it reads both-on; both-off is blocked.

### Slice 2 — Storefront product page reflects modes (shop render)
- Product page (`PublicProductPage.jsx`): show a small delivery-availability hint ("Endast upphämtning" / "Endast hemleverans" / both) so the customer knows before checkout. Pure display from `product.delivery` (default-on fallback).
- **Cross-check:** admin field (A) now RENDERS on shop. Reverse: nothing rendered that admin can't control.
- **Verify:** /browse a pickup-only and a shipping-only product; confirm the hint matches the toggles.

### Slice 3 — Pickup dates (admin control + write)
- `PickupLocationsEditor.jsx`: per location, a **dates** mini-editor — list of date inputs (`<input type="date">`), add/remove, stored as `dates: string[]` (ISO). Empty allowed.
- Persists automatically through the existing AdminSettings `storeForm.pickupLocations` → `saveShopConfig` path (F1: no clobber; verified). Add a code comment at BRANDING_KEYS warning not to add `pickupLocations`.
- **Cross-check:** admin field (D) — shop render is slice 6. Reverse: confirm `dates` survives the load→save→reload round-trip (the non-empty filter in AdminSettings/StoreSettingsContext passes arrays).
- **Verify:** add 3 dates to a location, save, reload admin → dates persist; load on storefront context.

### Slice 4 — Cart/checkout method restriction + server enforcement (MONEY PATH — highest stakes)
- `CartContext`: derive `allowedDeliveryMethods` from the cart (a method is allowed only if **every** item permits it). Expose it. If the current `deliveryMethod` becomes disallowed (e.g. cart changes), auto-switch to an allowed one. If NO method is allowed for the mix (e.g. a pickup-only item + a shipping-only item in the same cart), surface a clear blocker — **decision needed, see §6 Q1**.
- `Checkout.jsx`: the delivery-method selector only offers `allowedDeliveryMethods`; hide the toggle entirely if only one method is possible (and lock to it).
- `computeOrderTotalsSek` (server): after loading each product, **reject** the charge if `deliveryMethod` is disabled for any item (`delivery.shipping===false` with method 'home', or `delivery.pickup===false` with method 'pickup'). Default-on fallback for products without `delivery`. This is the anti-tamper + parity guard.
- **TOTAL-PARITY:** shipping math is unchanged; the only new server behavior is a hard reject (400) on a disallowed method — which the client can no longer send because the selector restricts it, so legitimate flows never hit it. Prove: home-only cart, pickup-only cart, mixed cart all behave identically client+server.
- **Cross-check (all 3):** A fully closed — admin toggle → cart restriction → server enforcement. Reverse: a tampered request is rejected.
- **Verify:** build + deploy functions; place a real pickup order on a pickup-enabled product (parity holds); attempt a forced bad method via direct request → 400.

### Slice 5 — Order stamps the pickup date (money-path tail)
- `Checkout.jsx`: pass the chosen `date` inside `deliveryInfo.pickupLocation`.
- `StripePaymentForm.jsx`: flatten to `deliveryInfo.pickupLocationDate`.
- `createPaymentIntent.ts`: accept `pickupLocationDate`, put it in PI metadata (only when pickup).
- `stripeWebhook.ts`: stamp `order.pickupLocation.date`.
- **Cross-check:** the new field flows checkout→PI→webhook→order, mirroring the existing id/name/address path exactly.
- **Verify:** pickup order with a date → order doc has `pickupLocation.date`.

### Slice 6 — Checkout pickup-date selector + order displays (shop + admin render)
- `Checkout.jsx`: when a pickup location with `dates.length>0` is chosen, render a required date `<select>` (locale-formatted labels). If the location has no dates, no picker (today's behavior). Validation: pickup with a dated location requires a chosen date.
- `OrderConfirmation.jsx`: show the chosen pickup date under the location. **(Mikael: order confirmation MUST show it.)**
- `AdminOrderDetail.jsx`: show the pickup date in the fulfillment card.
- `AdminOrders.jsx` list: **detail + confirmation only** (Q2 decided) — no date column in the list.
- **Cross-check (all 3):** D+E fully closed — configured date → selectable → stamped → saved to DB → shown in admin AND customer confirmation. Reverse: no date shown anywhere that wasn't chosen; no chosen date that isn't shown.
- **Verify:** /browse the full pickup flow end-to-end; confirm date on confirmation + admin detail; confirm the **order doc in Firestore** holds `pickupLocation.{id,name,address,date}` (DB-persistence proof).

### Slice 7 — Export pickup orders by location, separated by date (admin reporting)
- New util `src/utils/pickupExport.js` (CSV, mirrors `orderExport.js`'s blob/quote machinery — reuse, don't reinvent). Produces a **picklist** of pickup orders: columns = pickup location, pickup date, order number, customer name, items (qty×sku/label), total, status. **Sorted/grouped by location then date** so each location's dates form contiguous blocks; a section/blank-row separator between dates for at-a-glance scanning.
- `AdminOrders.jsx`: add an "Exportera upphämtningar" action next to the existing CSV export. It filters `orders` to `deliveryMethod === 'pickup'` (respecting the page's active filters, like the existing export does), then calls the new util. Optionally a location/date filter dropdown if the shop has many — keep v1 simple: export ALL pickup orders grouped by location+date; the grouping gives the separation Mikael asked for.
- **Cross-check (admin):** purely an admin reporting surface over DB data already stamped by slices 5/6 — no shop/platform axis. Reverse: every column maps to a real persisted order field (no invented data).
- **Verify:** create ≥2 pickup orders across 2 locations / 2 dates; export; confirm the CSV groups by location then date with correct separation, and totals/items match.

---

## 6. Decisions (RESOLVED 2026-06-17 by Mikael)

- **Q1 — Mixed cart (pickup-only + shipping-only item together):** ✅ **Block at cart** with a clear message. No split orders. (Slice 4.)
- **Q2 — Pickup date in admin orders LIST:** ✅ **Detail + confirmation only**; list stays compact. (Slice 6.)
- **Q3 — Date model:** ✅ **Fixed list of dates** the shop types per location (`dates: string[]`). No ranges/recurring. (§3.2, Slice 3.)
- **Q4 — Emails + labels:** ✅ **Defer** pickup-date in order emails (broken/shelved) and label printer. (§8.)
- **Q5 — Export (NEW, Mikael 2026-06-17):** ✅ **In scope** — export pickup orders by location, separated by date. (Slice 7.) Also reconfirmed: chosen pickup location + date **persisted to the order DB doc** and **shown on order confirmation** (Slices 5 + 6).

---

## 7. Platform axis — explicit (so it's not silently skipped)

Per the mandatory 3-way check, the platform axis was considered for every change:
- **Pickup is NOT an add-on.** It's core delivery, available whenever a shop configures locations. We are deliberately **not** adding `features.pickup` to the platform `/addons` console (it would let the platform disable a core capability, which Mikael framed as essential). If we ever want platform control of pickup, it's a separate decision — recorded here, not built.
- **Per-product delivery modes are shop-admin-controlled** (the shop owner decides per product), not platform-controlled — consistent with product editing already living in admin, not platform.
- No platform console surface changes in this work. (Confirmed: nothing in `PlatformAddons` / `features` needs to reflect these.)

---

## 8. Non-goals / out of scope (explicit)
- Email pickup-date (F3 — tied to email re-architecture, shelved). (Q4 deferred.)
- Label printer pickup address/date (F4). (Q4 deferred.)
- Customer account order-history delivery info (F5).
- Currency/Trustpilot dead-config (separate open item).
- Any change to the existing shipping-cost tier math (unchanged; parity preserved).

---

## 8b. Backlog from adversarial verify (deferred, low-sev, no charge risk)
- **Cart-page conflict hint:** `ShoppingCart.jsx` doesn't surface `hasDeliveryConflict` / which items conflict, so a blocked customer loops back to a cart with no indication of what to fix. Checkout already blocks the bad charge; this is a UX improvement. (LOW)
- **Server-validate the pickup date (S5):** `createPaymentIntent` passes `pickupLocationDate` to metadata without checking it's one of the location's configured dates (mirrors the existing un-validated `pickupLocationName/Address` pass-through). A tampered client could stamp an arbitrary date on its OWN order — data-only, no money/total impact, bounded by Stripe's 500-char cap, and the legitimate client constrains the `<option>`s to live config + requires a choice. Deliberately NOT added to the money path now (a new Firestore read + failure mode on every pickup checkout isn't worth it for a non-money tamper; would need to read the same config source `loadShopConfig` probes — tenant doc OR legacy settings/app). Revisit if pickup dates become operationally load-bearing. (LOW)
- (Resolved in S4: async-config false-flash of the block screen; misleading block copy; selector dep churn; StripePaymentForm PI-recreate-on-method-change.)

## 9. Risk register
- **R1 (money):** server reject on disallowed method must never fire for a legitimate client flow → client selector must be the single source of allowed methods, server only a backstop. Mitigation: slice 4 verifies all cart shapes client+server before deploy.
- **R2 (data):** `dates`/`delivery` must round-trip the config + product seams. Mitigation: explicit reload-after-save verify in slices 1/3.
- **R3 (parity):** any shipping-math edit must be mirrored. Mitigation: we add NO new shipping math — only a boolean gate; parity is structurally preserved.
- **R4 (regression):** future dev adds `pickupLocations` to BRANDING_KEYS → array clobber. Mitigation: comment at BRANDING_KEYS (slice 3).
