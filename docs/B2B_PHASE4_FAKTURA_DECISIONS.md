# B2B Phase 4 — Faktura (net-30 invoicing) decision brief

**Status:** DECISIONS NEEDED before any code. This is the deepest, riskiest slice
of the B2B add-on — it introduces a *second money flow* (invoice-pay-later)
alongside the existing Stripe card flow, and touches credit risk + VAT + AML.

**What's already built (Phases 0–3, live):** the `b2b` add-on toggle, a
per-product `b2bPrice` (ex moms), per-shop `b2bCustomers` identity with an admin
activation gate, and a browse-only portal (dashboard / wholesale catalog /
profile / orders-placeholder). What's missing is the one thing Phase 4 adds:
**placing an order and getting invoiced for it.**

---

## A. The two hard engineering pre-requisites (not optional, not advisor items)

These are decided by us (engineering), not the advisor. They block any ordering.

### A1. Order-creation mechanism — `orders` is server-only today
`firestore.rules`: `orders → allow create: if false`. Orders are created ONLY by
the Stripe webhook (Admin SDK). A Faktura order has **no card charge**, so it
can't ride the `createPaymentIntent → webhook` path. Options:

| Option | How | Pros | Cons |
|---|---|---|---|
| **A1a. New server callable `createB2BOrder`** (recommended) | A Cloud Function the portal calls; it validates the b2bCustomer is active + same-shop, computes totals server-side from `b2bPrice`, stamps `shopId`/`source:'b2b'`/`userId`, writes the order via Admin SDK. | Totals can't be tampered client-side; mirrors the trusted-server pattern; keeps `create:if false`. | New function to write + test. |
| **A1b. Scoped client-create rule** | Relax `orders create` to allow an active b2bCustomer to create their own B2B order. | No new function. | Client computes totals (tamperable); widens the most sensitive rule; STOP-and-surface rules deploy. **Not recommended.** |

**Recommendation: A1a.** Keep order-creation server-side and trusted.

### A2. The orders-LIST rule gap (the Phase-3 BLOCKER)
`orders → allow list` authorizes via `isActiveUser()`, which requires a
`users/{uid}` doc. B2B customers live in `b2bCustomers`, **not** `users` — so a
B2B customer's own order-history query is currently DENIED (why `B2BOrders` is a
placeholder, not a live query). Phase 4 must:
1. **Extend the `orders` list rule** so an active `b2bCustomers` profile can list
   its own orders. Firestore rules can't `where`-query, so the order doc must
   carry a linkage the rule can `get()` — e.g. stamp `b2bCustomerId` on the order
   and authorize `get(b2bCustomers/$(resource.data.b2bCustomerId)).data.firebaseAuthUid == request.auth.uid && ...active==true && ...shopId match`. (Mirrors how the existing b2c branch does `get(b2cCustomers/...)`.)
2. **Write `orders.userId = firebaseAuthUid`** (and `b2bCustomerId`) on create, so
   `B2BOrders`' query returns rows.
3. Flip `B2BOrders` from placeholder → the real query (already written, just
   commented out as a placeholder with the exact query documented).

---

## B. The advisor / business decisions (Faktura money flow)

These need YOUR call + likely the payments advisor + the accountant. They do NOT
have an obvious engineering default.

### B1. Invoicing engine — who issues + collects the invoice?
| Option | What | Trade-off |
|---|---|---|
| **Stripe Invoicing** | Stripe issues the invoice + hosts the pay page + (optionally) auto-charges later. Fits the existing Stripe relationship. | Stripe is still in the flow; need to confirm it works alongside the Connect/destination-charge model without routing money through a platform-held balance (see B3). Stripe Invoicing fees apply. |
| **External Swedish invoicing / factoring** (Fortnox, Billogram, a factoring provider) | A dedicated SE invoicing service issues + (factoring) even buys the receivable. | Best Swedish VAT/reminder/inkasso support; a factoring provider can absorb credit risk (B2). Integration work + per-invoice cost. |
| **Generate-our-own PDF + manual reconcile** | We render a PDF invoice; shop reconciles payment manually + marks the order paid. | Cheapest to build; no third-party. All credit risk + chasing on the shop; manual = doesn't scale; we'd be closer to "handling payment" (watch B3). |

### B2. Credit risk — who carries non-payment?
A net-30 invoice means goods ship before money arrives. If the B2B customer
doesn't pay, someone eats it:
- **The shop (tenant)** — simplest; the shop decides who it extends credit to (it
  already vets via the activation gate). Default assumption.
- **The platform (Meteor PR)** — only if we deliberately want to; adds real risk +
  likely regulatory weight. **Avoid.**
- **A factoring provider** — buys the receivable (pays the shop now, chases the
  customer). De-risks the shop for a fee. Worth it at volume.

**Likely default: the shop carries credit risk** (it controls activation +
credit terms). Confirm with advisor.

### B3. ⚠️ The AML "never hold funds" invariant (HARD constraint)
From [[three-way-payment-split]] / `three_way_payment_split.md`: **the platform
must NEVER let buyer→seller money sit in a platform-controlled balance.** Doing so
flips Meteor PR into a regulated payment institution (PSD2 / Betaltjänstlagen,
Finansinspektionen). For Faktura this means:
- The invoice payment must land in the **shop's** account (or a factor's), **not**
  a platform-pooled balance we later pay out.
- If using Stripe Invoicing on a Connect account, the invoice must be issued *on
  the connected (shop) account* (or destination-routed) so funds are never
  platform-held.
- **Re-confirm in the deployed flow** that no Faktura path routes money through a
  platform balance. This is a launch gate, not a build detail.

### B4. VAT on wholesale invoices
- B2B prices are **ex moms**; the invoice adds Swedish VAT (25% default) for
  domestic B2B.
- **Cross-border EU B2B** = reverse charge (no VAT on the invoice, customer
  self-accounts) IF the buyer has a valid EU VAT number — needs VAT-number
  capture + validation (we already collect `vatNumber` on the b2bCustomer).
- Who is the merchant of record on a Faktura sale — the shop or the platform? This
  affects whose VAT it is. (Differs from the card flow where platform = MoR.)
  **Accountant item.**

---

## C. Proposed Phase 4 build order (once B is decided)
1. **A2** — orders list-rule fix + `userId`/`b2bCustomerId` on B2B orders + flip
   `B2BOrders` to the live query. (Engineering; STOP-and-surface for the rules
   deploy.)
2. **A1a** — `createB2BOrder` server callable (validates active+same-shop,
   server-computed totals from `b2bPrice`, `source:'b2b'`, `paymentMethod:'Faktura'`,
   `status:'pending-payment'`, the `prisInfo` shape kept from the archive).
3. **Order form** in the portal (replaces the "coming soon" note): the catalog
   becomes selectable (qty per product), MOQ if wanted, server-computed total
   preview, submit → `createB2BOrder`.
4. **Invoicing** (per B1) — issue the invoice; reconcile payment → flip order
   status. Reuse the dormant `generateB2BTemplate` emails, re-tenanted (load shop
   branding, not hardcoded b8shield/JPH).
5. **Admin** — see B2B orders + their invoice/payment status; mark paid (or
   auto-reconcile via the engine's webhook).

## D. Launch gate (before first real Faktura öre — not before test)
- Advisor sign-off on the money-flow classification (B3) + credit-risk model (B2).
- Accountant confirm on wholesale VAT / reverse-charge / MoR (B4).
- Confirm in deployed code that no Faktura path holds funds on a platform balance.

---

### The decisions I need from you to start Phase 4
1. **B1** — Stripe Invoicing, an external SE service, or PDF-+-manual?
2. **B2** — who carries credit risk (default: the shop)?
3. **A1** — confirm A1a (server callable) over A1b (client rule)? (My rec: A1a.)
4. Do you want an **advisor session** booked before I build B-dependent parts, or
   should I build the A-prerequisites (A1/A2 — pure engineering, no money-flow
   risk) first while B is being decided?
