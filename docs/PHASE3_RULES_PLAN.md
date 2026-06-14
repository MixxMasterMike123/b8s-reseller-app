# Phase 3 — Security Rules (the hard tenant-isolation gate)

**Status:** PLAN, no rules deployed. Awaiting Mikael's review + explicit go.
**Goal:** Make tenant isolation *enforced* (not just filtered by Phase 2 queries). After this, an admin can only read/write data for their own shop; a `platform` super-admin bypasses scoping; public storefront reads stay open.
**Why highest-stakes:** a rules bug = either a cross-shop data leak OR a lockout of the live site. So: platform-exempt-first design (can't lock out the sole admin), staged, rules-test before deploy, explicit go.

---

## Current reality (audited 2026-06-14)

- **Exactly ONE admin:** micke.ohlen@gmail.com (uid 9AudFilG8VeYHcFnKgUtQkByAmn1), `users` doc has **no `shopId`**, and **no custom claim currently set** (claim was never synced / expired).
- Firestore `isAdmin()` reads `users/{uid}.role=='admin'` from the named DB (extra get per call, but works).
- Storage `isAdmin()` reads `token.role=='admin'` custom claim (storage rules CANNOT read the named DB).
- Claim today: only `{role:'admin'}`, stamped by `syncAdminClaims` (maintenance HTTP fn, secret-guarded).
- Public reads (`products`, `productGroups`, `pages`, `settings/app`, translations) are `allow read: if true` for anonymous shoppers. Orders use nuanced get(open)/list(gated). b2cCustomers/affiliates/affiliatePayouts are owner-or-admin.
- All shop data now carries `shopId` (Phase 1 backfill) and queries filter by it (Phase 2).

## The key insight that makes this SAFE

The sole admin should be the **platform super-admin** (Mikael — manages ALL shops). If rules treat `platform` as *bypasses shop-scoping*, then deploying scoped rules **cannot lock out the live site**, because the only admin is platform-exempt. Regular shop-admins (which don't exist yet) get scoped. So we add the platform tier FIRST, grant it to Mikael, THEN tighten — never the reverse.

---

## Target role model (rules)

- `platform` — super admin (Mikael). Bypasses shop-scoping. `users/{uid}.role=='platform'` (Firestore) + `token.platform==true` (Storage claim).
- `admin` — shop admin, scoped to `users/{uid}.shopId` (Firestore) / `token.shopId` (Storage claim). Sees only their shop.
- `user` — B2B/legacy (unchanged).
- B2C customers + affiliates — owner-scoped (unchanged), PLUS their docs already carry shopId.

Rules helpers to add (Firestore):
```
function isPlatform() { return isAuthenticated() &&
  exists(users/$(uid)) && get(users/$(uid)).data.role == 'platform'; }
function adminShopId() { return get(users/$(uid)).data.shopId; }   // for role=='admin'
function isAdminOfShop(shopId) { return isPlatform() ||
  (isAdmin() && adminShopId() == shopId); }   // isAdmin() stays role=='admin'
```
Storage (claim-based): `isPlatform()` = `token.platform==true`; `isAdminOfShop(sid)` = `isPlatform() || (token.role=='admin' && token.shopId==sid)`.

---

## Rollout sequence (each step reversible; STOP before the rules deploy)

**Step 1 — make Mikael `platform` (no rules change yet).**
- Set `users/9Aud….role = 'platform'` (currently 'admin'). Script, Mikael runs.
- ⚠ But MANY existing rules check `role=='admin'` exactly. If we change role to 'platform', `isAdmin()` returns false → Mikael loses access under the CURRENT rules. So role change MUST go together with rules that treat platform as admin-or-better. **Therefore Step 1 and Step 2 deploy together**, OR keep role=='admin' AND add a separate `platform:true` flag on the user doc. **DECISION NEEDED (Q1).**

**Step 2 — extend `syncAdminClaims` to stamp `shopId` + `platform` into the claim.**
- For each admin user: claim = `{role, shopId, platform}` from their user doc. Re-run after. (Storage needs this; Firestore can read the doc directly but the claim is cheaper.)
- Deploy the function, re-sync, Mikael re-logs-in (claims refresh on new token).

**Step 3 — new rules (firestore.rules + storage.rules), platform-exempt.**
- Replace `isAdmin()` gates on shop-scoped collections with `isAdminOfShop(resource.data.shopId)` (writes: `request.resource.data.shopId`).
- Platform bypasses; sole admin is platform → live site unaffected.
- Public reads stay `if true`. Owner-scoped reads (b2cCustomers/affiliates/orders get) unchanged. Add: for `list`, admins are constrained to their shop.
- Server-only collections stay deny (Admin SDK bypasses).

**Step 4 — rules unit test (emulator) BEFORE deploy.**
- Test matrix: anonymous (public read ok, private deny), platform (all shops ok), shopA-admin (shopA ok, shopB deny), b2c-customer (own only), affiliate (own only), cross-shop leak attempts (must deny). Use @firebase/rules-unit-testing against firestore.rules.

**Step 5 — deploy rules (STOP-and-surface, explicit go).** Then live-verify: storefront still renders, admin still works, a cross-shop read is denied.

---

## Decisions (Mikael, 2026-06-14) — ALL as recommended

1. **Platform tier = `platform:true` flag**, KEEP `role:'admin'`. `isAdmin()` (role=='admin') rules stay untouched; add `isPlatform()` = platform flag/claim true. No access gap.
2. **Set admin `shopId='b8shield'`** on the user doc too (belt-and-suspenders).
3. **Rules unit-test harness:** YES — add `@firebase/rules-unit-testing`, prove against the emulator before any deploy.
4. **Rules-only isolated deploy** (after the claim re-sync), separate from code.

## MANDATORY bidirectional check (Mikael 2026-06-14): "admin vs store AND store vs admin"
Every collection must be audited from BOTH sides, and the rules test matrix must prove BOTH for each actor:
- **No lockout (access still works):** anonymous shopper reads storefront; customer reads own orders/account; affiliate reads own data; shop-admin reads/writes OWN shop; platform reads/writes ALL. Every field admin can SAVE today must still save.
- **No leak (cross access denied):** shop-admin CANNOT read/write another shop's data; storefront/customer/affiliate cannot reach cross-shop or admin-only data; anonymous cannot read private collections.
For each collection below, verify the "store→admin" direction (does the shop still work?) AND the "admin→store" direction (is admin scoped + not leaking?). A pass requires GREEN on both, not just "leak denied".

## Build order (this phase)
- (a) Script to set `users/{mikael}.platform=true` + `shopId='b8shield'` (Mikael runs — STOP).
- (b) Extend `syncAdminClaims` to stamp `{role, shopId, platform}` into the custom claim; deploy fn; re-sync; Mikael re-logs-in.
- (c) Write new firestore.rules + storage.rules (platform-exempt; admin scoped by shopId; public reads open; owner reads unchanged).
- (d) Add rules unit-test suite; run on emulator — must pass (legit access OK, cross-shop leak DENIED).
- (e) STOP — show diff + test results, get explicit go, then rules-only deploy + live-verify.
