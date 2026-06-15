# Product model v2 — variants · categories · tags

**Status:** PLAN for approval (Mikael, 2026-06-15). No code until approved.
**Context:** No shops are live → **no data to migrate or preserve.** This is a clean
refactor, not a migration. Products/orders are test data and may be wiped + reseeded.

## The problem (today)
Three concepts are crammed into two mechanisms, and the names fight the meaning:
- **`group`** (a string + a `productGroups` side-collection) does double duty: it's
  BOTH the variant grouping (sizes/colours of one product, modeled as SEPARATE
  product docs sharing the string) AND what's been used as a category.
- **`tags`** muddle "category" and "light filter".

## Target model (3 clean concepts)
| Concept | Shape | Set in | Drives |
|---|---|---|---|
| **Variants** | embedded on the product: `variants: [{ sku, label, price, image? }]` | product form (optional, off by default) | the size/colour picker on the product page |
| **Category** | `category: string` (renamed from `group`) | product form (autocomplete, like group today) | top-nav + `/{shopId}/kategori/{slug}` pages |
| **Tags** | `tags: string[]` (already built) | tag chip-input | `featured` grid + optional light filters |

### Decisions (locked)
1. **Variants:** each variant has its own `sku` + `price` (per-variant pricing) + optional `image`. `label` is the human choice ("Small", "Röd"). No live data → no per-variant doc ids.
2. **Variants optional, OFF by default.** Form has a "Den här produkten har varianter" toggle. Off = simple product (one price, no picker — kills the "8× Standard" bug at the model level). On = edit a variant list. Product page shows the picker only when `variants.length > 0`.
3. **`category` drives `/kategori/`.** Remove the `/grupp/` route + the front-page group-collapse (obsolete: one product = one card). Tags become a lighter filter, NOT a `/kategori/` driver.
4. **No migration.** Drop `productGroups` collection + `group`/`defaultProductId` entirely. Old test products/orders can be cleared.

## Data shapes (new)
```
products/{id}
  name, sku, category (was `group`), tags[],
  b2cPrice, basePrice (== b2cPrice; base product price / fallback),
  hasVariants: bool,
  variants: [ { sku, label, price, image? } ],   // [] when hasVariants false
  isActive, availability:{b2c}, imageUrl, b2cImageUrl, b2cImageGallery,
  descriptions:{b2c,b2cMoreInfo}, weight, dimensions, shipping, ...
  shopId, createdAt, updatedAt
```
- DROP: `group`, the `productGroups` collection, `defaultProductId`, per-variant product docs, `size`/`color` as top-level fields (they become a variant's `label`).
- Shipping/weight stay PRODUCT-level (shared across variants) — simplest; variants differ by price/label/sku only. (Per-variant weight is a future refinement.)

### Cart line-item (new)
```
{ productId, variantSku|null, name, label, price, sku, image, weight, shipping, quantity }
```
Dedup key = `productId + variantSku`. Price snapshot from the chosen variant (or base price when no variants).

### Order item (new, via Stripe metadata → webhook)
```
{ productId, variantSku, sku, name, label, price, quantity, image }
```
Self-contained snapshot (as today) — display never re-fetches products.

### Server pricing (createPaymentIntent)
Load the PARENT product doc by `productId`; if `variantSku` present, resolve the
variant inside `product.variants` for its price; else use `b2cPrice||basePrice`.
Replaces today's `doc(db,'products',item.id)` per-variant lookup (which breaks).

## Touch-list (from the forensic audit)
**Product model + admin:**
- `ProductForm.jsx` — rename group→category field; add `hasVariants` toggle + a variants editor (sku/label/price/image rows); drop `size`/`color` top-level + ProductGroupTab.
- `AdminProducts.jsx` — `availableCategories` (was groups); row badge → category; list price/variant note.
- DELETE `ProductGroupTab.jsx` + `utils/productGroups.js` (group content/defaultProductId gone).

**Product page (`PublicProductPage.jsx`):**
- Read `product.variants` directly (no same-`group` query). Picker from variants; hidden when none. Selecting a variant = in-page state (no navigation between docs). Remove the `defaultProductId` redirect + `isMultipack`/special-edition hardcoding.
- Add-to-cart sends `{productId, variantSku}`.

**Cart (`CartContext.jsx`):** new line-item shape + dedup by productId+variantSku.

**Checkout/payment (`StripePaymentForm.jsx`, `createPaymentIntent.ts`):** send productId+variantSku; server resolves variant price from the parent doc; metadata carries variant id.

**Webhook (`stripeWebhook.ts`):** order.items carry productId+variantSku+label snapshot.

**Storefront (`PublicStorefront.jsx`):** drop group-collapse — one card per product. `category` → nav links + `/kategori/`.

**Collections (`CollectionPage.jsx`, `App.jsx`, `productUrls.js`):**
- `/kategori/:slug` filters by `category` (not tag). REMOVE `/grupp/:group` route + `mode="group"` + `getGroupUrl`. Tag links still exist as a light filter (decide: keep tag chips for `featured`-style browse, but the PRIMARY taxonomy is `category`).

**Functions (`order-processing/functions.ts`):** the `group==='B8Shield-special-edition'` revenue gating → neutralize (brand-specific dead logic; no live data).

## Slice order (each: build → verifier → commit+push; deploy on go)
- **S1 — Product model + admin form.** category rename + `hasVariants` toggle + variants editor; drop group/ProductGroupTab. (Admin can author the new shape.)
- **S2 — Product page.** Read embedded variants; picker from variants (hidden when none); selection in-page; add-to-cart {productId,variantSku}.
- **S3 — Cart + payment + order.** New line-item shape; server variant pricing; webhook order items. (The commerce path — highest care; parity check.)
- **S4 — Storefront + collections.** Drop collapse; `category` nav + `/kategori/`; remove `/grupp/`; reconcile tags as the light filter.
- **S5 — Cleanup.** Delete productGroups util/tab; neutralize special-edition gating; remove dead group helpers.

After S5, you reseed products in the new shape (no script needed — just add them in the admin).

## Open question for Mikael
- **Tags after category lands:** keep the tag chip-input + the `featured` grid (yes), but do you still want tag-based browse chips on the storefront at all, or are tags purely `featured` + admin-internal now? (Default plan: keep tags for `featured` and drop the general storefront tag-filter chips, since `category` is the browse driver.)
