# Platform Architecture — three siloed surfaces

**Status:** ARCHITECTURE for review (Mikael, 2026-06-14). No code yet (the earlier in-admin platform page was reverted as the wrong model). `isPlatform` in AuthContext is the only kept foundation.
**Decision driver (Mikael):** a true multi-tenant SaaS with THREE separate, siloed surfaces — Platform operator console, Shop Admin, Storefront — each isolated; a shop owner never sees Platform; shop A can never reach shop B's anything. Built as subdomains on ONE app. Researched against Shopify, WordPress Multisite, Vendure, Medusa, Saleor, Vercel Platforms (see findings summary below).

---

## Research summary (what mature platforms do)
- **Domain separates storefront from admin everywhere.** Operator-vs-tenant is an **identity + permission scope**, not a second admin app. Operators enter a shop via an explicit, **audited "log in to store"** action (Shopify Collaborator + WorkOS impersonation rails are the gold standard) — never a silent backdoor.
- **Platform home = the tenant fleet table** (not a stats dashboard). Rows: name · status badge · plan · created/last-active · owner; hover actions Open Admin / Open Storefront / Impersonate; ⋯ for suspend/audit.
- **Subdomain-per-surface + HOST-SCOPED cookies (no `Domain` attribute), distinct cookie name per surface, CSRF tokens.** This is what makes the silo real and stops a compromised tenant subdomain from reaching the operator console. Reserve `platform`/`admin`/`api`/`www` from tenant registration.
- **Entitlements ≠ release flags.** Model paid add-ons (e.g. affiliate) as an entitlement layer = plan default + per-shop override (Schematic/Stripe-Entitlements model). Don't reuse release/kill-switch flags for paid gating.
- Nearest single precedent to our model: **Vendure SuperAdmin + channel-scoped Roles** (native operator-over-shops with hard per-tenant admin scoping).

---

## Current state (audited)
- One app; `App.jsx:122-133` derives `appMode` from the subdomain: `shop`/`shop-*` → 'shop', else → 'admin'. Adding 'platform' is a clean extension.
- Hosting targets today: `meteorpr` (admin), `shop-meteorpr` (shop) — both serve the same `dist`; subdomain decides mode at runtime.
- Auth: Firebase Auth (single project). `isPlatform` now in AuthContext (reads users/{uid}.platform). Phase 3 rules enforce shopId isolation + platform bypass at the DB layer ALREADY — so data siloing is done; this work is the UI/surface siloing on top.
- Phase 0b (path-prefix storefront URLs + storage path partitioning) is NOT done — needed before REAL second shops have distinct public URLs/storage. Demo shops as data are fine now.

---

## Target: three surfaces

```
SURFACE          HOST (target)                       MODE        WHO            AUTH COOKIE (host-scoped, no Domain attr)
Platform         platform.meteorpr(.web.app/.com)    'platform'  platform only  __op_session
Shop Admin       meteorpr / admin.meteorpr           'admin'     shop admins    __shop_admin_session
Storefront       shop-meteorpr / {tenant}.meteorpr   'shop'      public         __shop_session
```
- **One app, subdomain → mode** (extend `App.jsx` appMode to add 'platform'). Each mode mounts ONLY its own routes + its own layout/shell. Platform mode never imports the shop-admin AppLayout; shop-admin never imports platform UI. That's the "completely disconnected" requirement, enforced structurally.
- **New Firebase hosting target** `platform-meteorpr` → `platform.meteorpr.web.app` (additive, same project, same pattern as the meteorpr rebrand). STOP-and-surface: Mikael creates the hosting site / authorizes.
- **Siloing enforcement = 3 layers:** (1) Phase 3 Firestore/Storage rules [done], (2) PlatformRoute/AdminRoute guards [UI], (3) host-scoped cookies + mode-gated route mounting [surface]. Defense in depth.

---

## Platform console IA (operator)
- **Home: tenant fleet table.** Columns: shop name (→ drill-down) · status badge (active/disabled/trial) · plan · created · owner. Row actions: **Open Storefront** (link to that shop's storefront), **Open Shop Admin** (audited impersonation), **⋯** (suspend/kill-switch, audit). Top KPI cards (active shops, total orders/revenue rollup) later.
- **Tenant drill-down** (breadcrumb `Platform / [Shop] / [section]`), tabs: Overview · Features/Add-ons · Billing · Users · Audit · Danger zone.
- **Global sections** (left nav): Shops (home), Add-ons/plan catalog, Payments/Billing, System settings.
- **"Open Shop Admin" = audited impersonation** (WorkOS rails): operator-gated, mandatory reason, auto-expire (~30-60 min), non-dismissible "viewing [Shop] as platform" banner in shop admin, immutable audit log (who/shop/reason/start+end), writes tagged with impersonation context. Mechanism: an impersonated-shopId in the session that shop-admin's `useShopId()` honors + the banner. (Phase 0b makes "Open Shop Admin" able to target a shop by its own URL; until then impersonation overrides the active shopId in-app.)
- **"Open Storefront"** = plain link to the shop's storefront (no auth).

---

## Feature-flag / entitlement model (add-ons)
```
shops/{shopId}.plan: 'free'|'basic'|'pro'        (later; manual toggles first per Mikael)
shops/{shopId}.features: { affiliate, campaigns, dining, ambassador }  ← per-shop entitlement (override)
```
- v1 = **manual per-shop toggles** (Mikael's choice); plans/catalog later when billing lands.
- A `useShopFeatures()` hook reads `shops/{shopId}.features`; storefront + shop-admin gate UI; functions check server-side (defense in depth). Default-on for the existing shop so nothing breaks.
- **Affiliate is the first add-on** (~12 touchpoints mapped in SUPERADMIN_SPEC.md): storefront routes/nav, checkout discount, click logging; admin nav + pages; functions.
- Keep entitlements SEPARATE from any release flags.

---

## Phased build order (each: build → verify → commit → deploy on go)

**P4.0 — Platform surface skeleton (no new hosting yet).**
- Extend `App.jsx` appMode to recognize a `platform` subdomain → mount a NEW `platform` route tree with its OWN `PlatformLayout` (distinct shell — its own sidebar: Shops / Add-ons / Payments / Settings). Gate with `PlatformRoute`.
- For local/dev before the subdomain exists: also allow `/platform/*` under the admin host BUT gated to platform, so it's testable. (Temporary dev affordance; production uses the subdomain.)

**P4.1 — Tenant fleet table (the Platform home).**
- List all shops (platform reads per rules) + status + counts; **Open Storefront** link + **kill-switch** toggle. (Open Shop Admin stubbed until P4.3.)

**P4.2 — New hosting target + cookie siloing.** STOP-and-surface.
- Mikael creates `platform-meteorpr` hosting site → `platform.meteorpr.web.app`; add `.firebaserc` target + `firebase.json` block. Verify host-scoped session (Firebase Auth persistence is per-origin by default — good; confirm no domain-wide cookie).

**P4.3 — Audited "Open Shop Admin" impersonation.** Security-critical; build with the WorkOS rails (reason, expiry, banner, audit log, impersonation-tagged context). shop-admin `useShopId()` honors an impersonated shopId.

**P4.4 — Provision a shop** (create shops/{id} + features + optional owner user via createAdminUserV2 + claim sync).

**P4.5 — Feature/add-on entitlements** (per-shop Features tab + `useShopFeatures()` + wire affiliate as the first add-on through its touchpoints).

**P4.6 — Per-shop users management.**

**P4.7 — Per-shop stats.**

**P4.8 — Billing/invoicing (platform→shop)** — largest; its own phase. Manual mark-paid first; Stripe Entitlements when volume justifies.

**Dependency:** real second shops at distinct public URLs need **Phase 0b** (path-prefix/subdomain storefront URLs + storage path partitioning). Demo shops as data work without it; P4.3 impersonation covers "operator views a shop's admin" in the meantime.

---

## Open questions for Mikael (before P4.0)
1. **Local-dev affordance:** OK to also expose the platform UI at `/platform/*` on the admin host (platform-gated) for testing before the `platform.` subdomain/hosting exists? (Production = subdomain; this is just so you can see it now without waiting on hosting setup.) Recommended: yes.
2. **Hosting name:** `platform.meteorpr.web.app` via a new `platform-meteorpr` hosting site — good? (Same additive pattern as the meteorpr rebrand.)
3. **Build P4.0+P4.1 now** (platform shell with its own layout + the fleet table, testable at /platform on admin host), then do the hosting target (P4.2) + impersonation (P4.3) next? Recommended.
