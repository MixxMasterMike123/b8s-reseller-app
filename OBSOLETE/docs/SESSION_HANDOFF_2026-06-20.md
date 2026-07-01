# Session handoff — meteorpr platform (2026-06-20)

Paste the "PROMPT FOR NEW CHAT" section below into a fresh conversation. The rest is reference.

---

## PROMPT FOR NEW CHAT

> Continue work on the meteorpr multi-tenant webshop platform (Firebase: Firestore + Cloud Functions + Storage; React/Vite client). Branch `salvage/cleanup-and-security`. Read these memory files FIRST: `tenant_isolation_audit.md`, `payments_stripe_connect.md`, `working_method.md`, `rebrand_meteorpr.md`. Also `docs/TENANT_ISOLATION_REMEDIATION_PLAN.md` and `docs/SESSION_HANDOFF_2026-06-20.md`.
>
> **What's DONE + LIVE:** full tenant-isolation hardening across all 3 layers — Firestore rules, Cloud Functions (7 criticals closed), Storage (partitioned + 458 objects migrated). meteorpr landing page (live at meteorpr.web.app). Stripe Connect payments BUILT + committed (Slices 0-4) but NOT deployed and NOT runtime-verified (blocked on company registration — see payments memory; do NOT pick this up).
>
> **PRIORITY: finish the remaining tenant-isolation audit findings + add a CI gate.** These are medium-severity (cross-tenant *enumeration*/info-leak + hygiene, NOT data destruction — the destructive holes are already closed). Specifically:
> 1. **CI emulator gate (do FIRST — highest leverage):** wire the 4 existing rules-test suites (`rules-tests/firestore-rules.test.cjs`, `firestore-isolation.test.cjs`, `functions-isolation.test.cjs`, `storage-isolation.test.cjs` — plus `connect-params.test.cjs`) into a CI check (GitHub Actions) so isolation can't regress as shops are added. Emulator needs JDK21 (see below).
> 2. **`adminUIDs` + `adminPresence`:** a shop admin can enumerate OTHER shops' admins (emails / who's online). Scope reads to own shop, or move the role-toggle write to a platform-callable. (adminPresence: stamp shopId in `useAdminPresence.js` first, then tighten the read rule — staged, STOP-and-surface deploy.)
> 3. **`passwordResets` + `emailVerifications`:** not shop-scoped — stamp shopId on create + scope the lookup; backfill legacy docs.
> 4. **`auditLogs` + `adminCustomerDocuments`:** missing shopId — stamp + add to `scripts/backfill-shopid.cjs` IN_SCOPE.
> 5. **`DynamicRouteHandler.jsx`** (~line 46): pages query missing a `where('shopId')` filter — slug collision could load the wrong shop's page.
>
> Each finding has its attack + fix in `docs/TENANT_ISOLATION_AUDIT_2026-06-18.md`. Work in slices, build + emulator-test green before committing, and treat any rules/functions DEPLOY as STOP-and-surface (ask before deploying live). Use the multi-agent workflow approach if it fits (ultracode is on).

---

## Reference — current platform state

**Branch:** `salvage/cleanup-and-security` (all work committed + pushed). Project `b8shield-reseller-app`, named DB `b8s-reseller-db`. Hosting: meteorpr.web.app (admin), shop-meteorpr.web.app (storefront), platform-meteorpr.web.app (operator). Live shops: b8shield, melodieomc, sillmans. 2 platform super-admins (micke, kent).

**DONE + LIVE:**
- Tenant isolation: firestore.rules hardened (ruleset 0a461a61); Cloud Functions shop-parity via `requireAdminOfShop` (7 criticals); Storage shopId-partitioned + migrated. 372 stale legacy users purged.
- Landing page (Swedish, "enklaste webbutiken", contact form frontend-only, 7 calm meteors) at meteorpr.web.app.

**BUILT but NOT deployed/verified — DO NOT resume without the user:**
- Stripe Connect payments (Slices 0-4, commits 3fbb96b/b1f672c/fb62fdb/d0fa0eb). Destination charges, Express accounts, platform=VAT MoR, per-shop opt-in. Money-path logic verified (connectFee 8/8 + connect-params 23/23) but Stripe RUNTIME unverified — blocked on registering a company to complete the Connect platform profile. Full detail + resume steps in `payments_stripe_connect.md`.

**OTHER parked (lower priority):**
- Storage step 5: delete old flat storage objects + remove legacy read-only rule blocks (safety net from the migration; been live since 2026-06-18). Quick cleanup.
- Contact-sales form backend (~20 min Cloud Function — currently logs leads only; TODO at `src/pages/LandingPage.jsx`).
- Custom domains (Phase D): researched in `docs/MULTITENANCY_INDUSTRY_COMPARISON_AND_CUSTOM_DOMAINS.md` (verified `domains/{host}→shopId` table, X-Forwarded-Host, Firebase auto-TLS, domain stays cosmetic). Bigger build, own session.

**Toolchain notes:**
- Emulator: `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home firebase emulators:start --only firestore --project demo-rules-test` then `node rules-tests/<suite>.test.cjs`. Storage suite uses `--only storage` (port 9199).
- Functions: `cd functions && npm run build` (tsc). Client: `npm run build` (vite).
- `functions/.env.local` holds the Stripe TEST key (gitignored — never commit/deploy). Live uses pk_live/sk_live (Functions secret).
- Working method: never ship bugs, build+emulator-test before commit, commit+push together, rules/functions deploy = STOP-and-surface (ask first).
