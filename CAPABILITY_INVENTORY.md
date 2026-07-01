# Capability Inventory — Storefront Platform (b8shield_portal)

A map, not an audit. For each area: **EXISTS / PARTIAL / MISSING**, one line, main file/module.
Scope: consumer-facing print-on-demand multi-tenant storefront (Swedish sellers, Stripe Connect).

---

## Shipping & Delivery

| Item | Status | What's there | Main file |
|---|---|---|---|
| Shipping cost shown to buyer pre-purchase | **EXISTS** | Per-country tiered/weight-based cost computed in cart, shown as "Frakt (land)" line before payment | [src/contexts/CartContext.jsx](src/contexts/CartContext.jsx) |
| Who is sender / who generates label (printer dropship?) | **PARTIAL** | Admin-side 40×60mm thermal/HTML label generation only; **no printer/POD dropship integration, no carrier API** — fulfillment is manual | [src/utils/labelPrinter.js](src/utils/labelPrinter.js) |
| Tracking surfaced to end customer | **MISSING** | `trackingNumber` field exists in the order model but is never populated or shown to the buyer; no tracking page | [src/pages/shop/OrderConfirmation.jsx](src/pages/shop/OrderConfirmation.jsx) |
| Return address handling | **MISSING** | No per-shop return address; general shop address exists for footer only, not returns | [src/pages/admin/AdminSettings.jsx](src/pages/admin/AdminSettings.jsx) |

> Pickup / Click & Collect is fully built (dates + locations, shipping zeroed) — distinct from real shipping. ([src/utils/pickupDates.js](src/utils/pickupDates.js))

---

## End-Customer Legal Surface (per shop)

| Item | Status | What's there | Main file |
|---|---|---|---|
| Auto-generated buyer terms / return policy / delivery info | **PARTIAL** | Manual CMS pages per shop (not auto-generated); POD withdrawal notice IS system-generated at checkout | [src/pages/admin/AdminPageEdit.jsx](src/pages/admin/AdminPageEdit.jsx), [src/utils/withdrawal.js](src/utils/withdrawal.js) |
| Seller identity + contact shown in each shop | **EXISTS** | Footer renders `legalName`, `orgNumber`, address, support email from per-shop config | [src/components/shop/ShopFooter.jsx](src/components/shop/ShopFooter.jsx) |
| Privacy policy toward end customer | **PARTIAL** | Footer links to `legal/integritetspolicy`, but content is a manually-authored CMS page (no per-shop default) | [src/pages/shop/DynamicPage.jsx](src/pages/shop/DynamicPage.jsx) |
| Cookie/consent banner + any analytics | **PARTIAL** | Cookiebot CMP loads on shop pages but with a **single hardcoded domain group ID (not per-shop)**; no GA/pixel/Trustpilot tracking wired | [src/components/shop/CookiebotCMP.jsx](src/components/shop/CookiebotCMP.jsx) |
| End-customer GDPR (controller / export / erasure) | **MISSING** | No controller designation shown; no buyer-facing data export or erasure flow (profile edit only) | [src/pages/shop/CustomerAccount.jsx](src/pages/shop/CustomerAccount.jsx) |

---

## Email / Transactional Messaging

| Item | Status | What's there | Main file |
|---|---|---|---|
| Order confirmation / shipping notification / receipt to customer | **PARTIAL** | All templates built & wired (confirmation on payment, status/shipping update on admin change, VAT line on receipt) — **but delivery is broken**: SMTP creds expired/missing, throws if unset | [functions/src/email-orchestrator/services/EmailService.ts](functions/src/email-orchestrator/services/EmailService.ts) |
| Any email/notification system at all | **PARTIAL** | Full email-orchestrator exists (order, status, affiliate, verification, password) — code is production-ready, single-tenant, and not currently functional pending credential rotation | [functions/src/email-orchestrator/](functions/src/email-orchestrator/) |

> Correction to prior notes: email is **built and wired**, not absent — the gap is config/credentials + single-tenancy, not missing code.

---

## VAT on the Seller Side

| Item | Status | What's there | Main file |
|---|---|---|---|
| Seller sets VAT rate per product; appears on receipt | **PARTIAL** | VAT is **store-wide, hardcoded 25%** — no per-product rate; the flat 25% does render correctly on receipt + email | [src/config/store.js](src/config/store.js) |
| VAT-registered company vs below-threshold individual | **MISSING** | `sellerType` (individual/company) exists and drives DAC7 tax reporting, but **VAT calc does not branch** — everyone charges 25% | [functions/src/dac7/functions.ts](functions/src/dac7/functions.ts) |

---

## Product Catalog & Design Upload

| Item | Status | What's there | Main file |
|---|---|---|---|
| Artist design upload → printer products/print areas | **MISSING** | No customer/artist design upload, no print-area mapping, no POD-printer integration; `isPersonalized` is a checkout consent flag only | [src/utils/withdrawal.js](src/utils/withdrawal.js) |
| File resolution/format validation against print requirements | **MISSING** | Only file-size (5MB) checks + web-display compression; no DPI/resolution/print-spec validation | [src/utils/imageUpload.js](src/utils/imageUpload.js) |
| Product catalog model (size/colour variants) | **EXISTS** | v2 embedded variants `{sku, label, price, image?}` gated by `hasVariants`; storefront variant picker + variant-aware cart/pricing (per-variant image UI not yet built) | [src/components/admin/ProductForm.jsx](src/components/admin/ProductForm.jsx) |

> Admin uploading product **catalog images** EXISTS; customer uploading a **design to print** does not.

---

## Onboarding (the "5-minute" path)

| Item | Status | What's there | Main file |
|---|---|---|---|
| register → sellerType → Stripe → create shop → first product → live | **PARTIAL** | **Operator-provisioned, not self-service**: platform admin creates shop + owner user; admin then does Stripe Connect + tax data + products separately. No guided wizard; sellerType is admin-page, not checkout | [src/components/platform/ProvisionShopModal.jsx](src/components/platform/ProvisionShopModal.jsx), [src/pages/admin/AdminPayments.jsx](src/pages/admin/AdminPayments.jsx) |

> Drop-off / unfinished: no self-serve registration→shop wizard; steps are disconnected admin screens; Stripe Connect onboarding is built but blocked on platform-level Connect registration.

---

## Storefront Maturity

| Item | Status | What's there | Main file |
|---|---|---|---|
| Custom domain / subdomain per shop | **MISSING** | Path-prefix routing only (`/{shopId}/se/...`); custom-domain binding is researched/spec'd, not built | [docs/MULTITENANCY_INDUSTRY_COMPARISON_AND_CUSTOM_DOMAINS.md](docs/MULTITENANCY_INDUSTRY_COMPARISON_AND_CUSTOM_DOMAINS.md) |
| Discount codes / campaigns | **PARTIAL** | Affiliate discount codes live + server-validated; campaign wagon is a scaffold (no checkout wiring); **no generic coupon system** | [functions/src/affiliate/callable/validateDiscountCode.ts](functions/src/affiliate/callable/validateDiscountCode.ts) |
| Seller-facing analytics | **PARTIAL** | Per-shop dashboard (revenue, orders, customers, affiliate) + affiliate analytics; no export/BI, funnel, or cohort | [src/pages/admin/AdminDashboard.jsx](src/pages/admin/AdminDashboard.jsx) |
| Content moderation queue (DSA report→takedown) | **PARTIAL** | Platform kill-switch to disable a shop exists; **no user-report UI and no review/triage queue** | [src/pages/platform/PlatformShops.jsx](src/pages/platform/PlatformShops.jsx) |

---

## Biggest Gaps for a Consumer-Facing "5-Minute Shop"

1. **No fulfillment loop.** No POD/printer integration, no carrier labels, no tracking to the buyer — "print-on-demand" has no actual print/ship backend; it's manual.
2. **Email is non-functional.** Every transactional template exists but nothing sends (dead SMTP creds + single-tenant) — buyers get no confirmation/receipt/shipping mail.
3. **No self-service onboarding.** Shops are hand-provisioned by the platform operator; there is no register→sellerType→Stripe→shop→product→live wizard, so "5 minutes" isn't reachable yet.
4. **The core product (upload-to-print) doesn't exist.** No artist design upload, print-area mapping, or print-spec/DPI validation — only admin catalog images.
5. **Consumer legal/VAT surface is thin.** Per-product VAT and seller-type VAT branching are missing; GDPR export/erasure absent; legal/privacy pages are manual; cookie CMP is hardcoded to one domain — weak for a multi-tenant consumer marketplace.
