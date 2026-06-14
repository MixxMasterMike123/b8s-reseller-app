# Plan — Full storefront de-brand + admin-editable content

**Status:** Proposal, no code yet. Awaiting Mikael's approval.
**Goal:** A fresh shop (no config) renders 100% GENERIC copy/images — zero "B8Shield", zero fishing language, zero B8Shield product photos. Every storefront section's text is editable from admin. (Mikael clears the saved Firestore translation overrides himself — that's the "Upptäck B8Shield" data layer, out of code scope.)
**Rules:** NORD design + structure foremost; per-slice build+verify+commit; NO deploy until Mikael says; final INVERSE-AUDIT step (grep for any remaining brand/fishing literal).

---

## The two problems (different fixes)

1. **Neutralize defaults** — every `t('key', 'B8Shield…')` default and every hardcoded image/string becomes GENERIC. This alone removes the embarrassment for unconfigured shops. (Note: a saved Firestore translation can still override a key — Mikael clears those; our job is that the *code default* is neutral.)
2. **Add admin control** — section copy that has NO admin field (testimonial, section descriptions, intro/about, SEO) becomes editable on the Butik page, written through the shopConfig seam.

---

## Slice 1 — Neutralize all code defaults (no new admin UI)

Make a fresh shop generic. Edit defaults in place; keep the `store.X || t(key, default)` pattern but make `default` neutral.

**PublicStorefront.jsx:**
- Hero subtitle default → generic ("Welcome to our shop" / sv: "Välkommen till vår butik").
- Hero testimonial fallback (quote + "Paul W., Sportfiskarna Sverige") → neutral or hidden when no real review (prefer: hide the review mini if no review, rather than show fake copy).
- Story/features 3 defaults ("Bevisat Effektivt"/fishing) → generic 3 steps ("Kvalitet", "Snabb leverans", "Trygg betalning").
- products_section_subtitle, special_editions_description ("B8Shield-produkter"), clothing_section_description ("passionerade fiskaren"), reviews_section_subtitle ("nöjda sportfiskare") → generic.
- Gallery fallback: 4 hardcoded b8s_*.webp images + "B8Shield <color>" labels → render NOTHING when no gallery configured (empty gallery → hide band), instead of B8Shield images. (blocks already gate it; just drop the B8Shield fallback array.)
- Product name/desc fallbacks ("B8Shield {{group}}" etc.) → generic ("{{group}}", "Produkt").
- OG/twitter meta image (shop.b8shield.com/b8s_top.webp) → use store.heroImageUrl/logo or omit.

**src/utils/productUrls.js:** getShopSeoTitle/Description + product SEO defaults (all B8Shield/Vasskydd) → generic, driven by store.shopName where possible.

**PublicProductPage.jsx / ShippingInfo.jsx:** B8Shield literals in descriptions/copy → generic.

Deliverable: unconfigured shop shows zero B8Shield. Commit.

## Slice 2 — Admin-editable section copy (new Butik fields)

Add a "Sidtexter / Page copy" tile (or extend existing tiles) on AdminStorefront for the section strings that currently have no control. New config keys (BRANDING_KEYS + shopConfig):
- `introTitle`, `introBody` — the about/intro block under the hero (this is what Mikael saw as "Upptäck B8Shield"). Make it a real, optional, admin-driven block (hidden if empty).
- `productsTitle`, `productsSubtitle`
- `reviewsTitle`, `reviewsSubtitle`
- `testimonial: { quote, author }` — hero trust tile (overrides the review fallback)
- (special-editions / clothing section copy: only if those sections stay — see open question)

Wire each into PublicStorefront (config wins → neutral default). Commit.

## Slice 3 — SEO/OG per-shop

storeConfig-driven SEO title/description/OG image (fallback to shopName + tagline + logo), replacing the B8Shield SEO defaults in productUrls.js. Commit.

## Slice 4 — INVERSE AUDIT (the step that was missing before)

Automated + manual:
- `grep -rni "b8shield\|vasskydd\|fisk\|sportfisk\|Sillmans\|Paul W" src/pages/shop src/components/shop src/utils/productUrls.js` → must return ONLY non-user-visible code (group keys like 'B8Shield-special-edition' that are data identifiers, flagged separately) — zero user-visible brand strings.
- Confirm every homepage section has either an admin field or a neutral default.
- Spawn a read-only verifier to independently confirm "a no-config shop renders generic."
Commit the audit notes.

---

## Decisions (Mikael, 2026-06-14) — locked

1. **Special Editions + Clothing → COLLAPSE into normal product groups.** Drop the special-cased sections entirely; all products render as regular groups. Removes the `group === 'B8Shield-special-edition'` / `'Clothing'` branching AND its hardcoded copy (special_editions_title/description, special_edition_badge/cta, clothing_section_title/description/badge/cta). Big simplification.
2. **Intro/about block → OPTIONAL ADMIN BLOCK.** New `introTitle` + `introBody` config; renders between hero and products; hidden entirely when both empty. This is the home for what was "Upptäck B8Shield".
3. **Testimonial tile → HIDE when no real review.** Remove the fake fallback quote/author entirely; the review mini only renders if a genuine review (heroReview) loaded. No admin testimonial field needed.

These shrink Slice 1 (less copy to neutralize once special/clothing sections go) and Slice 2 (no testimonial field; add intro block instead).
