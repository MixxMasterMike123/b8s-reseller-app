# Tenant Isolation Hardening — 100% siloed shop admins

**Status:** PLAN — awaiting Mikael's decisions. No rules/code changes until approved (rules deploy is on the STOP-and-surface list — [[working-method]]).
**Branch:** `salvage/cleanup-and-security`.
**Stakes:** SECURITY (cross-tenant data isolation), Firestore + Storage rules, Auth claims, multi-tenant. Highest-stakes class.
**Trigger:** Mikael — "all admins need to be 100% siloed to each shop and added admins, no leaks between shops" + "consider future personal DNS/domains."

---

## TL;DR
The URL question was the symptom; the real issue is **isolation lives in the security rules, not the URL.** Audit finds the rules are ~70% scoped but have **real cross-shop leaks** where a shop admin can read/write another shop's data. The trusted tenant key (`shopId` custom claim) ALREADY exists (`syncAdminClaims` + `createShopUser` set `{role, shopId, platform}` on the token), so the fix is mostly **tightening rules to use it consistently** — not new infrastructure. Custom domains are a thin layer ON TOP of correct rules; rules must be right first.

---

## What's already CORRECT (the good news)
- `isAdminOfShop(shopId)` helper = `isPlatform() || (isAdmin() && userDoc().shopId == shopId)`. Used correctly on the shop-scoped collections: `products`, `productGroups`, `pages`, `orders` (update/delete + list), `b2cCustomers`, `affiliates`, `affiliateClicks`, `affiliateApplications`, `affiliatePayouts`, `campaigns`, `marketingMaterials` (write). Writes stamp/guard shopId properly.
- Orders: `create: false` (server-only via webhook), `list` correctly scoped per shop, single `get` open by design (unguessable id = confirmation page capability).
- `shops/{shopId}`: create/delete platform-only; update = platform or own-shop. Correct.
- `impersonationAudit`: platform-only, no-delete, actorUid anti-spoof. Correct.
- Claims model: `syncAdminClaims` (functions/src/customer-admin/functions.ts:548) writes `{role:'admin', shopId, platform}`; `createShopUser` (email-orchestrator/.../createShopUser.ts:115) sets them on new shop admins. So `request.auth.token.shopId` is trustworthy.

## CONFIRMED LEAKS (a shop admin sees/touches OTHER shops' data) — Firestore
1. **`users` read+create (rules:64-76) — BIGGEST.** `read: if isUserOrAdmin(userId)` → ANY admin reads ANY user doc (other shops' admins/customers: email, role, shopId). `create: if isAdmin()` → a shop admin can create users with ANY shopId (or none) → can mint an admin for another shop, or an unscoped admin. Update already guards privilege fields, but create doesn't scope shopId.
2. **`orderStatuses` (188-191):** `read: isActiveUser`, `write: isAdmin` — global, any admin writes.
3. **`marketingMaterials` read (253):** `isActiveUser() || isAdmin()` → any admin reads all shops' materials. (write is scoped; read is not.)
4. **`translations_*` write (112-123) + `settings/app` write (127-129):** `isAdmin()` → any shop admin overwrites GLOBAL translations/config affecting every shop.
5. **`settings/{settingId}` (131-134):** `write: isAdmin` global.
6. **Admin-tooling block (270-308) — NOT shop-scoped:** `userWagonSettings`, `adminPresence`, `adminUIDs`, `activities`, `followUps`, `deferredActivities`, `ambassadorActivities`, `userMentions`, `customerDocuments`, `adminCustomerDocuments`, `appSettings` — all bare `isAdmin()`. A shop admin reads/writes another shop's CRM, presence, app settings. (Some are dining/ambassador wagon CRM — may be intentionally platform-only tooling; needs per-collection decision, see Q2.)

## CONFIRMED LEAKS — Storage (storage.rules)
Rules' own comment admits it: "Storage paths are not yet shopId-partitioned... any admin (role claim) writes, platform included."
7. **`products/**` write (line ~48):** `isAdmin()` → a shop admin overwrites/deletes ANOTHER shop's product images.
8. **`branding/**` write:** `isAdmin()` → overwrite another shop's logo/hero/gallery.
9. **`marketing-materials/**`, order attachments, CRM docs:** `isAdmin()` global.
Root cause: storage paths aren't shop-prefixed (`products/{file}` not `products/{shopId}/{file}`), so the rule has no shopId to check. Fixing storage isolation needs BOTH a path restructure AND rule change → larger, data-migration-shaped.

---

## Fix plan (phased, isolation-first)

### ⚠️ ADVERSARIAL REVIEW FINDING (2026-06-17) — Phase A is NOT a no-migration change
Built the full hardened rules + a cross-tenant emulator suite (rules-tests/firestore-isolation.test.cjs). Both suites went green (28 + 23) — BUT the adversarial review proved the tests seeded an IDEALIZED world (claims on every context, shopId on every doc, single-doc reads) that does NOT match what the live app writes. Against real data shapes the rewrite causes **production LOCKOUTS**:
- **LOCKOUT #1/#2 (users):** client `createUserProfile` writes user docs with NO `shopId` (AuthContext.jsx:558-569); `getAllUsers()` does an UNFILTERED `getDocs(collection(db,'users'))` (AuthContext.jsx:367) → scoped `users` rules deny create/update/role-change AND the whole list query for shop admins; legacy user docs also lack shopId. PREREQ: the deferred shopId backfill ([[tenancy-migration-progress]]) + client changes to stamp shopId on user create and scope the users-list query.
- **LOCKOUT #3 (settings/app):** `saveShopConfig` falls back to writing `settings/app` for the DEFAULT shop pre-seed (shopConfig.js) → making it platform-only breaks the EXISTING b8shield admin's Settings/Storefront save TODAY. PREREQ: run the default-shop seed (shops/b8shield) so writes target the tenant doc, then it's safe.
- **LOCKOUT #4 (orderStatuses):** docs have no shopId (seed scripts only) → scoping the read denies everyone non-platform. (Latent: nothing reads it at runtime.) PREREQ: backfill shopId or leave as-is.
- **adminPresence / adminCustomerDocuments → platform-only** breaks CORE non-platform admin flows (presence heartbeat every 60s; admin docs on user pages). Several were `isAdmin()` in HEAD. PREREQ: shop-scope them (add shopId) or update client gating.
- **STALE-CLAIM window:** no `users` onWrite trigger re-syncs custom claims; `revokeRefreshTokens` never called. A demoted/ shop-moved admin keeps the old claim ~1h. Storage rules are claim-ONLY (no doc fallback) → worse. PREREQ: add a users onWrite claim-resync + revokeRefreshTokens on demotion.

CONCLUSION: the rules rewrite is CORRECT (deny side proven) but BLOCKED on (a) the shopId backfill, (b) the default-shop seed, (c) client stamp/filter changes, (d) a claim-resync trigger. These must land FIRST. The hardened rules + isolation tests are saved (see git history of this branch / the test file) as the spec for when prereqs are met. **Rules reverted to HEAD; nothing deployed.** Only safely-deployable-now slice: translations→platform-only (no in-app writer) — but deferred too, to ship the isolation as one coherent, tested unit rather than piecemeal.

### Phase A — Firestore rule tightening (no data migration; highest value)
Rewrite each leaking rule to scope by shopId via `isAdminOfShop(...)` or the `shopId` claim. Specifics:
- `users`: read → own doc OR platform OR (admin AND target user's shopId == caller's shopId). create → platform (any) OR admin scoped: `request.resource.data.shopId == userDoc().shopId` AND can't set `platform:true` unless caller is platform. This is the key fix.
- `orderStatuses`, `marketingMaterials` read, the admin-tooling block: add shopId scoping where the collection is shop data; keep `isPlatform()`-only for genuinely global/operator tooling (decide per collection, Q2).
- `translations_*`, `settings/app`, `settings/*`: make write **platform-only** (global config a shop admin shouldn't touch) — Q3.
- Add a `claimShopId()` helper (`request.auth.token.shopId`) to avoid a `get()` on every check (perf + cost; `get()`-based `userDoc()` is 1 read per eval).
- **Verify with the rules emulator** (unit tests: shopA admin denied on shopB docs across every collection) BEFORE deploy. Rules deploy = STOP-and-surface; Mikael runs/approves it.

### Phase B — Storage isolation (path restructure + rules; data-migration-shaped)
- New scheme: `products/{shopId}/...`, `branding/{shopId}/...`, etc. Rules check `isPlatform() || token.shopId == {shopId}`.
- Migrate existing objects (b8shield's) into the prefixed path; update the upload code (`imageUpload.js`, ProductForm, AdminStorefront) to write the prefixed path; update stored URLs. This is the bigger lift; sequence after Phase A.

### Phase C — Admin URL shop scoping ([[admin-config-shopid-seam]] / ADMIN_URL_SHOP_SCOPING_PLAN)
- `/admin/{shopId}/...` + route authz (owner bounced from other shops). Now PURELY a UX/clarity + defense-in-depth layer on top of correct rules. Phase 1 (visible shopId indicator) already shipped.

### Phase D — Custom domains (future)
- Per-shop domain (e.g. `sillmans.se`, `admin.sillmans.se`) maps to a shopId at the edge. Options: (1) Firebase Hosting custom domains per site + a host→shopId map; (2) a domains collection `shops/{id}.domains[]` resolved by `resolveShopId` from `window.location.host`. The storefront already resolves shop from path; host-based resolution is additive. **Depends on Phase A** (rules are the real boundary; a custom domain with leaky rules still leaks). Plan separately when prioritized.

---

## Decisions needed (Mikael)
- **Q1 — scope now:** Do Phase A (Firestore rule tightening) first as its own hardening pass? (Recommended — biggest isolation win, no migration.) Storage (B) + URL (C) follow.
- **Q2 — admin-tooling collections (users/wagon CRM/presence/appSettings):** which are per-SHOP (scope to shopId) vs genuinely PLATFORM-only operator tooling (lock to `isPlatform()`)? e.g. dining/ambassador wagon CRM, `adminPresence`, `appSettings`. I'll propose a per-collection mapping for your sign-off.
- **Q3 — global config (translations, settings/app):** make these platform-only writes? (A shop admin shouldn't edit global translations affecting all shops.) Per-shop translation overrides are a separate feature if wanted.
- **Q4 — added admins:** confirm the model — a shop owner adding a sub-admin for THEIR shop should only be able to create users with their own shopId, never platform, never another shop. (Phase A `users.create` fix enforces this.)
- **Q5 — verification bar:** set up the Firebase rules emulator + a cross-tenant test suite (shopA-denied-on-shopB for every collection) as the gate before any rules deploy? (Strongly recommended for a security change.)

## Risk
- Rules are the hard gate; a too-tight rule can lock out legitimate admin access (e.g. break the existing b8shield admin or the platform console). Mitigation: emulator test suite (Q5) covering BOTH allow + deny per role per collection, run before deploy; deploy rules separately from hosting; verify live with a real per-shop admin + platform login after.
- The `b8shield` default shop + existing admin (Mikael/kent) must keep working — platform bypass covers kent; verify the b8shield admin path.
