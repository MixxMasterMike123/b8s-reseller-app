# Plan — Storefront/Branding admin section (shopId-ready)

**Status:** Proposal, no code yet. Awaiting Mikael's approval.
**Decisions in force:** multi-tenant is the destination; branding UI built first, designed so adding `shopId` scoping later is a thin change. See memory `admin-platform-direction`.
**Goal of this slice:** give a non-technical shop owner real control over the NORD storefront's look + homepage content — the controls that are currently code-only — without yet doing the full tenancy migration.

---

## 1. Why this slice first

The NORD storefront is built but its identity is hardcoded. A shop owner can already edit name/address/social and fully manage products (with real image upload), but **cannot** set the one thing that makes the store *theirs*: accent color, logo/hero images, hero copy, and homepage blocks. This slice closes that gap and doubles as the first NORD-styled admin page.

Everything here is **tenancy-agnostic**: it reads/writes the shop config object that `StoreSettingsContext` already consumes. Today that's `settings/app.storeIdentity` (one global doc). Under multi-tenant it becomes `shops/{shopId}` — but the form, the fields, and the save shape are identical. We isolate the read/write behind one helper so the migration touches one function, not the UI.

---

## 2. Config schema additions (`src/config/store.js` + `settings/app.storeIdentity`)

These already exist: `accent`, `heroImageUrl`, `heroHeadline`, `heroSubtitle`. They're just not editable in admin. This slice makes them editable and adds the homepage-block + CTA fields.

```
storeIdentity (additions / now-editable)
├─ accent:        "#0E5E63"        // EXISTS — add color-picker UI
├─ logoUrl:       "/images/…"       // EXISTS as URL — add upload
├─ heroImageUrl:  "/images/…"       // EXISTS as URL — add upload
├─ heroHeadline:  ""                // EXISTS — add field
├─ heroSubtitle:  ""                // EXISTS — add field
├─ heroCtaLabel:  ""                // NEW — falls back to t('hero_shop_now_button')
├─ heroSecondaryLabel: ""           // NEW — falls back to "Se sortimentet"
├─ story: [                         // NEW — replaces hardcoded story band
│    { number, title, text } × up to 3
│  ]   // empty array → hide the story band entirely
├─ gallery: [                       // NEW — replaces hardcoded B8Shield nature imgs
│    { imageUrl, label, linkSku? } × up to 4
│  ]   // empty → hide the gallery band
└─ blocks: {                        // NEW — homepage block visibility
     gallery: true, story: true, bestseller: true, trust: true
   }
```

Notes:
- `bestseller` product selection and `trust{rating,blurb}` are deferred to a follow-up slice (they need a product-picker and touch the Trustpilot integration). This slice ships brand + hero + story + gallery + block toggles, which is the visible 80%.
- Block *reordering* is deferred; block *visibility* toggles ship now (simpler, covers "this shop has no story band").

---

## 3. Where it lives in the admin (IA decision for this slice)

Two options considered:

- **(a)** Add a third tab "Butik / Storefront" to the existing `AdminSettings.jsx` (alongside Wagon Management + Applikationsinställningar).
- **(b)** New top-level nav item "Butik" → new `AdminStorefront.jsx` page.

**Recommendation: (b) — a new top-level "Butik" nav item.** Reasons: (1) store branding is a primary shop-owner task, not a "system setting" buried in a tab; (2) it's the natural home for the eventual live preview; (3) it lets us NORD-style a fresh page without disturbing the wagon UI. The existing `Inställningar` page keeps the legal/identity/social fields (name, org number, VAT, address) — those are "settings"; branding is its own thing.

Resulting shop-owner-facing nav (this slice just adds "Butik"):
`Dashboard · Butik (NEW) · Produkter · Ordrar · Kunder · Inställningar` — with the B8Shield-internal items (B2B-användare, Marknadsföring, AI Vagnar) to be hidden/gated in the later IA cleanup, NOT in this slice.

---

## 4. Screen structure — `AdminStorefront.jsx`

NORD-styled (canvas, white tiles, accent, Familjen Grotesk headings) — first admin page in the new language. Sections as stacked white tiles:

**Tile 1 — Varumärke (Brand)**
- Accent color: color picker + hex input. Live swatch showing a sample button (white text on accent) with an inline **WCAG-AA contrast check** ("✓ Tillräcklig kontrast" / "⚠ För ljus — vit text blir svårläst"). This enforces DESIGN.md's "must pass AA as button background with white text."
- Logo: image upload (drop/select) → preview → stored URL. Reuses the product uploader (see §5).
- Hero image: image upload → preview, with a note that empty = the accent-gradient fallback renders.

**Tile 2 — Hero**
- Headline (text), Subtitle (textarea), CTA label, secondary link label. Each shows its current fallback as placeholder so an empty field visibly = "uses default."

**Tile 3 — Startsidans block (Homepage blocks)**
- Toggle rows: Galleri · Berättelse (story) · Bästsäljare · Trygghet (trust). Off → block hidden on storefront.

**Tile 4 — Berättelse (Story band)**
- Up to 3 steps, each: title + text. Add/remove step. (Number auto-renders 01/02/03.)

**Tile 5 — Galleri**
- Up to 4 items, each: image upload + label + optional product SKU link. Add/remove.

**Save bar** (sticky bottom): one "Spara" writing the whole `storeIdentity` merge, plus a "Förhandsgranska butik" link opening the storefront in a new tab. (Live in-page preview = follow-up.)

---

## 5. Reuse, not rebuild (key implementation notes)

- **Image upload:** `AdminProducts.jsx` lines 403–469 already do Firebase Storage upload + canvas WebP compression + resize. **Extract** that into `src/utils/imageUpload.js` (`uploadStoreImage(file, kind)` → returns URL, path `branding/{kind}_{ts}.webp`). Then both AdminProducts and AdminStorefront use it. Zero new upload logic.
- **Config read/write seam (the shopId-ready part):** add `src/config/shopConfig.js` with `loadShopConfig()` / `saveShopConfig(patch)` wrapping the `settings/app` doc. AdminStorefront and AdminSettings both call these instead of touching `doc(db,'settings','app')` directly. When multi-tenant lands, only these two functions change to `shops/{shopId}`. `StoreSettingsContext` switches to `loadShopConfig()` too.
- **Storefront consumption:** `PublicStorefront.jsx` already reads `store.heroImageUrl/heroHeadline/heroSubtitle`. This slice extends it to read `store.story`, `store.gallery`, `store.blocks`, `store.heroCtaLabel` — replacing the hardcoded arrays/JSX with config (falling back to current defaults when unset, so nothing breaks for B8Shield).
- **No new deps.** Color picker = a native `<input type="color">` + hex text field (no library); contrast check = a ~10-line relative-luminance function.

---

## 6. Explicitly NOT in this slice (so scope is clear)

- The `shopId` data-model migration + security rules + platform-super-admin role (the real tenancy work — separate, larger slice, done before shop #2).
- Bestseller product-picker + trust rating/blurb config.
- Block reordering (only visibility toggles now).
- Live in-page storefront preview.
- Restyling the other 13 old-style shop pages + the rest of the admin console.
- Multilingual editing of these new fields (ship sv-SE first, matching current hero behavior).

---

## 7. Suggested build order within the slice

1. Extract `imageUpload.js` from AdminProducts (pure refactor, verify products still upload).
2. Add `shopConfig.js` read/write seam; point StoreSettingsContext + AdminSettings save at it (pure refactor, no behavior change).
3. Build `AdminStorefront.jsx` (NORD-styled) — Brand + Hero tiles first (highest value: accent + logo + hero), commit.
4. Add Story + Gallery + block-toggle tiles; wire `PublicStorefront` to consume them, commit.
5. Add "Butik" nav item in AppLayout.

Each step builds + commits independently.
