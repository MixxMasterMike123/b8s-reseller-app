# B8Shield — Session Handoff & Cleanup Log

**Written:** 2026-05-29
**Author:** Claude Code session (started in the now-obsolete `b8shield_store` repo)
**Purpose:** Document the constellation cleanup + deep sweep, so a fresh session opened *in this `b8shield_portal` folder* has full context.

---

## TL;DR

- There used to be **5 overlapping B8Shield codebases**. Four were dead ends.
- **`b8shield_portal` (this folder) is the only keeper** — it has the real, recent, complete code: the front-facing shop, the admin section, and the affiliate engine.
- The other 4 were deleted or abandoned (details below).
- **The strategic direction:** explore pivoting the affiliate engine toward a **Print-On-Demand (POD)** platform. The affiliate idea is the asset worth keeping.
- **Open a fresh Claude Code session IN THIS FOLDER** (`/Users/mikaelohlen/Cursor Apps/b8shield_portal`). The folder this handoff was written from (`b8shield_store`) is obsolete — ignore it.

---

## What was done in the previous session

### 1. Deep sweep of the codebase constellation

Discovered 5 B8Shield projects on disk:

| Repo | Stack | State | Verdict |
|---|---|---|---|
| **`b8shield_portal`** ← KEEP | React + Firebase, affiliate engine, "wagon" plugin system, shop + admin | Live, most complete (last commit Oct 8 2025) | **The only one worth keeping** |
| `b8shield-supabase` | Firebase→Supabase rewrite | Abandoned mid-migration (Sep 2025) | DELETED |
| `b8shield_nextjs_migration` | Next.js rewrite of portal | Abandoned mid-migration (Sep 2025) | DELETED |
| `b8shield-saas` | Multi-tenant SaaS reframing | Abandoned experiment (Jul 2025) | DELETED |
| `b8shield_store` | Next.js + WooCommerce storefront, **zero affiliate code** | Abandoned experiment (Jul 2025) | OBSOLETE — left in place (see notes) |

**Key insight:** The pattern of 3 abandoned full migrations is a warning. Each new migration stalled because the portal is *itself* half-migrated internally (legacy V1 god-file + clean V2 TypeScript running side by side). Any fresh rewrite drags that ambiguity along.

### 2. Deleted the 3 dead sibling repos

Removed from `/Users/mikaelohlen/Cursor Apps/` (~371 MB freed):
- `b8shield-saas` (had 1 untracked file, 1 unpushed commit)
- `b8shield-supabase` (had 9 dirty files incl. an untracked `.env.production`)
- `b8shield_nextjs_migration` (had 5 unpushed commits, **no remote** — those are gone for good)

User explicitly approved deleting unpushed work — confirmed dead ends.

### 3. Flagged a live GitHub token for revocation

`b8shield-saas` had a live GitHub Personal Access Token (`ghp_R0ci...`) committed into its git remote URL. **User said they would revoke it at github.com/settings/tokens.**
> ⚠️ **If not yet revoked, do it now** — deleting the folder did NOT disable the token.

---

## Deep-sweep findings on THIS repo (`b8shield_portal`)

These are the things a fresh session should know. Nothing below has been fixed yet — they are open items.

### The core disease: permanently mid-migration
Two backends run at once:
- **Legacy V1:** `functions/index.js` — a **3,149-line god-file, ~55% commented-out dead code** (`approveAffiliate`, `logAffiliateClick`, `processB2COrderCompletion` all sit commented "MIGRATED TO V2"). `generateContentWithClaude` is defined **twice** (second silently shadows first).
- **Live V2:** `functions/src/*.ts` — clean, modular TypeScript (payment, affiliate, order-processing, email-orchestrator). **This is the good code.**

There are 2–3 copies of critical money logic. Example: `functions/webhook-standalone.js:92` has `// TODO: Add full order creation logic here` — but that file is **DEAD**. The live path is `functions/src/payment/stripeWebhook.ts` (`stripeWebhookV2`), which is correct: verifies signature, idempotent, creates order server-side, defers affiliate commission to avoid double-credit.

### The affiliate engine — the asset worth keeping
Sound design, decent V2 logic. Flow: affiliate code → click logged (`affiliateClicks`, 30-day localStorage attribution via `src/components/AffiliateTracker.jsx`) → order carries code → server recomputes commission on `payment_intent.succeeded` (`functions/src/order-processing/functions.ts`) → balance accrues → manual payout recorded in `affiliatePayouts`.

**Money-cracks to fix before trusting it:**
1. `firestore.rules:137` — `allow create: if isAuthenticated()` on `affiliateClicks` → anyone can forge clicks.
2. `firestore.rules:60` — `allow write: if isAuthenticated()` on `products` → any user can rewrite prices. **Revenue theft.**
3. No self-referral prevention — affiliate can use own code at checkout.
4. No quantity/price validation in commission math (`item.price * item.quantity`, no guards).
5. Payout race: `src/utils/affiliatePayouts.js:95` reads balance OUTSIDE the transaction → concurrent overdraw.
6. Payouts are bookkeeping only (manual invoice) — no real money movement. Fine for one company, non-starter for multi-seller POD (needs Stripe Connect / Wise).

**B8Shield coupling (moderate, not fatal):** hardcoded product names (`transparent`, `rod`, `glitter`, `KAJJAN`/`EMMA` campaigns), Swedish 25% VAT in the commission formula, SEK hardcoded, `se`/`gb`/`us` language segments.

### The "wagon" plugin system — clever but leaky
Dynamic `import.meta.glob` discovery, manifests, lazy routes, enable/disable flags — genuinely good discovery mechanism. **But** wagons reach into core `AuthContext`, `AppLayout`, and the Firebase `db` singleton, so they aren't truly standalone (leaky abstraction). Only **Writers (~80%) and Dining (~70%)** wagons are real; Ambassador, Campaign, FishTrip, Weather are 20–60% stubs. Pattern to re-implement cleanly, not code to port wholesale.

### 🔴 Two urgent security items in THIS repo (not yet done)
1. **Secrets committed to git history:** `x_admin_keys.csv`, `x_b2b-portal_keys.csv`, `x_b2c-shop_keys.csv`, `functions/temp.env` are tracked. `service-account.json` / `serviceAccountKey.json` sit in the working tree. → **Rotate these keys (assume compromised) and purge from history.**
2. **Unguarded admin HTTP endpoints:** `createAdminUser`, `setupCompleteDatabase`, `emergencyRestore`, `createTestData` have **no auth** — an HTTP POST creates an admin or wipes data. (Confirm whether V1 is still deployed; if so, they're live.)

There is also a prior audit: `SECURITY_AUDIT_2025-10-02.md` (scored 7/10) — overlaps with the above; read it alongside this.

---

## Strategic verdict (from the sweep)

**For a POD pivot: fresh build, with deliberate salvage — NOT migration attempt #4.**

Reasoning: 3 prior full migrations already stalled. POD needs a fundamentally different data model (multi-tenant sellers, print providers, designs-as-products, multi-party money split: platform + seller + affiliate + print cost). The current single-merchant SEK-bookkeeping payout can't express that and must be rebuilt on Stripe Connect regardless. Salvage **patterns + ~5 files**, not the codebase.

**Physically salvage (copy + de-B8Shield-ify):**
1. `src/utils/affiliateCalculations.js` — commission formula + code normalization (make rate/tax/currency configurable per tenant).
2. The `stripeWebhookV2` pattern (`functions/src/payment/stripeWebhook.ts`) — server-side order creation from payment metadata, idempotency, deferred commission. Gold standard.
3. The attribution flow (URL `?ref=` → click log → 30-day window → server recompute) — reimplement with fraud fixes baked in.
4. The wagon discovery idea (`import.meta.glob`) — keep, but design the boundary properly (inject context, no direct core imports).
5. The affiliate analytics dashboard UI as reference.

**Leave behind:** the 3,149-line god-file, the campaign-wagon, the 4 stub wagons, manual-payout bookkeeping, all hardcoded product/email/UID values.

Net: ~40% of the affiliate engine's *logic* is reusable; ~5% of the *total codebase* is.

---

## Suggested first moves for the fresh portal session

1. **Confirm the GitHub token (`ghp_R0ci...`) is revoked.**
2. **Secure this repo's committed secrets** — rotate + purge `x_*keys.csv`, `temp.env`, `service-account*.json` from git history.
3. **Lock the unguarded admin endpoints** (or confirm V1 isn't deployed).
4. Then either: tighten the affiliate fraud/race holes in place, **or** extract a clean, generic POD affiliate-engine spec (data model + commission/attribution/payout on Stripe Connect) for a fresh build.
5. Optional: pressure-test the POD wedge ("POD shops run by non-technical people") before writing code — `/office-hours`.

---

## Housekeeping notes

- The obsolete `b8shield_store` folder still exists at `~/Documents/CursorSites/b8shield_store`. It is tangled inside an **accidental home-directory git repo** (`~` itself is a git repo whose remote points at an unrelated project, `IGPmaster/casimboo`). Deleting from inside that repo is risky (750 dirty files) — it was deliberately left alone. Clean up manually later if desired.
- This handoff file lives at the root of `b8shield_portal` as `SESSION_HANDOFF.md`.
