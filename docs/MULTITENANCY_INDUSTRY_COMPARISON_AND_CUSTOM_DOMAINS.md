# Multi-Tenancy: Industry Comparison + Custom-Domain Architecture (2026-06-19)

Research answering two questions: (1) do other shop platforms isolate tenants the way we do? (2) how would we let a shop owner bring their own domain/DNS? All claims sourced inline.

## TL;DR
- **Our model is the industry-standard "POOL" pattern** (shared infra + a tenant key), the same as Shopify, BigCommerce, Vendure, Saleor. We are NOT doing anything weird.
- **We're stronger than baseline on one axis:** we enforce the boundary at the **data layer** (Firestore Security Rules = the Postgres-RLS equivalent / "default-deny floor"), which Medusa & Saleor lack (they isolate in app code only). Closest peer = Vendure (purpose-built multi-tenant).
- **Tenant key = signed `shopId` JWT claim** is the canonical "identity layer carries trusted tenant_id" pattern (AWS ABAC). Our deliberate tweak — read `userDoc().shopId` (live doc) instead of the claim — trades one read for INSTANT revocation. Intentional, documented, defensible.
- **The load-bearing principle (AWS, verbatim):** *authentication/authorization is NOT isolation* — a logged-in, authorized user can still reach another tenant's data unless isolation is a separate enforced layer. This is exactly why our audit found real holes despite auth working, and why the function/storage hardening was the real fix.
- **Custom domains on Firebase = config + small code, NOT infra.** Add a verified `domains/{host}→shopId` table resolved via `X-Forwarded-Host`; Firebase auto-issues TLS. The domain stays COSMETIC — the `shopId` claim/rules remain the only boundary.

## Isolation model comparison
| Platform | Model | Where enforced |
|---|---|---|
| Shopify | POOL — sharded by `shop_id` into isolated "pods" | Edge host-routing ("Sorting Hat") + physical pod isolation + row `shop_id` |
| BigCommerce | POOL — `store hash` key | App layer on store hash |
| Vendure (closest peer) | POOL — one DB, `Channel` per tenant | `ctx.channelId` injected into every query; ChannelAware entities |
| Saleor | POOL — channels (explicitly NOT a hard wall; catalog shared) | App/resolver filtering — partial |
| Medusa | Multi-tenancy NOT native — recommends instance-per-tenant | App-layer sales-channel scoping only |
| **Us** | **POOL — Firestore + `shopId`** | **Firestore/Storage RULES (data layer) + `requireAdminOfShop` in functions, keyed on signed `shopId` claim** |

Canonical SaaS models (AWS SaaS Lens): SILO (resource-per-tenant) / POOL (shared + tenant_id) / BRIDGE (per-layer mix). DB-per-tenant is a flavor of SILO, not "bridge." Commerce at scale = POOL. Microsoft calls per-tenant tables an antipattern. Sources:
- Shopify pods: https://shopify.engineering/a-pods-architecture-to-allow-shopify-to-scale
- Shopify Let's Encrypt: https://shopify.engineering/securing-shopify-domains-letsencrypt
- Vendure multi-tenant: https://vendure.io/blog/multi-tenant-commerce-with-vendure ; channels: https://docs.vendure.io/guides/core-concepts/channels/
- Saleor channels: https://docs.saleor.io/developer/channels/overview
- Medusa multi-tenant: https://medusajs.com/blog/multi-tenant-rigby/
- AWS silo/pool/bridge: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
- AWS "authn/authz is not isolation": https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/tenant-isolation.html
- AWS ABAC tenant_id in JWT: https://aws.amazon.com/blogs/security/saas-tenant-isolation-with-abac-using-aws-sts-support-for-tags-in-jwt/
- Postgres RLS (our Firestore-rules analog): https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OWASP multi-tenant cheat sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html

## Custom domains — recommended architecture on Firebase Hosting
Goal: a shop brings `shop.theirbrand.com` (or apex), it serves their storefront, and the `shopId` claim/rules stay the ONLY security boundary.

1. **One Hosting site, many custom domains** (NOT site-per-shop — Firebase caps at 36 sites). Shared edge → rewrite → one function that resolves host→shopId. Same single-edge model as Shopify's shared `shops.myshopify.com` CNAME.
2. **Verified `domains/{hostname} → { shopId, verified }`** in Firestore, writable by PLATFORM only after ownership verification. Resolver reads **`X-Forwarded-Host`** (⚠️ NOT `Host` — Firebase rewrites Host to the function's domain behind a rewrite: https://firebase.blog/posts/2024/07/app-hosting-updates/). Replaces today's `/{shopId}/...` path prefix (config/tenancy.js resolveShopId); run both during migration.
3. **DNS recipe per merchant:** (a) TXT to verify ownership; (b) A record for apex / record-per-wizard for subdomain — READ THE FIREBASE CONSOLE, never hardcode the IP (it has changed across Firebase eras; current docs show 199.36.158.100 but trust the wizard); (c) remove conflicting A/AAAA/CNAME or cert won't mint. Docs: https://firebase.google.com/docs/hosting/custom-domain
4. **TLS: nothing to build.** Firebase auto-provisions + auto-renews free cert within ~24h of verification.
5. **THE RULE (OWASP/AWS):** `X-Forwarded-Host` only selects which storefront to render / which shop's PUBLIC data to read — ZERO authority. Every privileged read/write stays gated by `shopId` claim / `userDoc().shopId` / `requireAdminOfShop` regardless of which domain hit it. Host header is attacker-controllable; host-based tenant bypass is a known attack class. Never derive a WRITE target's shopId from host or payload — only from the resource being mutated (requireAdminOfShop already does this).

## Cleanup this enables
Replaces brittle hardcoded host checks already in the code: `shop.b8shield.com` literals in src/contexts/LanguageCurrencyContext.jsx + src/utils/geoLanguageCurrency.js + src/contexts/TranslationContext.jsx — these should become the generic `domains/{host}→shopId` resolver for a 10-20-shop future. This is the deferred "Phase D — custom domains" from TENANT_ISOLATION_HARDENING_PLAN.md.
