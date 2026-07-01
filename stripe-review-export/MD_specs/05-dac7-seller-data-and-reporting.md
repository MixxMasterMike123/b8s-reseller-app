# 05 — DAC7 seller data + reporting

**Priority:** P0 (legal obligation on the platform)
**Status:** ✅ Specified — verify against acceptance criteria. (This was the last package built —
use this checklist to confirm completeness.)

## Purpose
The DAC7 reporting obligation sits on **the platform operator**, not Stripe (payment processors
are out of scope of DAC7). Sale of goods is a reportable activity. The platform must collect
seller due-diligence data, aggregate it per seller per year, and report to Skatteverket.

## Current state (from the export)
**Nothing built.** Only a free-text `orgNumber` field is stored (`seller-data.md`); no tax ID /
personnummer / DOB, no per-seller aggregation, no export, no Stripe tax-reporting feature.

## Requirements

### A. Data source — pull from Stripe, not a re-typed form
1. First **evaluate/enable Stripe's "platform tax reporting" (DAC7) feature** for the account;
   report what it collects and whether it can export Skatteverket-ready data.
2. Persist the seller due-diligence fields DAC7 needs: legal name, **tax ID**
   (personnummer for individuals / org.nr for companies), VAT number where applicable, address,
   country of residence, and **date of birth** (individuals).
3. **Pull these from Stripe Express KYC via the platform API** (Stripe already verified them at
   onboarding). Only fall back to a manual collection form in shop-owner onboarding if Stripe
   can't provide them — and then each seller sees ONLY their own fields.
   **Pull-from-Stripe is the source of truth** for the reportable identifiers.

### B. Aggregation + de-minimis
4. Per-seller, per-**calendar-year** aggregation: gross consideration + transaction count.
5. De-minimis test for goods sellers: **fewer than 30 sales AND ≤ EUR 2,000 → excluded** — but
   still computed and stored (you must show you ran the test).

### C. Reporting + access control
6. Build an **export of reportable sellers** (or wire up Stripe's DAC7 export).
   Skatteverket **registration** is a separate manual step (handled off-system).
7. **Access control (hard rule):** aggregation, de-minimis evaluation, report generation and the
   export live in **PLATFORM ADMIN ONLY**, access-controlled. A shop owner must **never** see
   another seller's data or reach the export. (This is a GDPR/access requirement, not just DAC7.)

### D. Seller self-service — GDPR rectification (chosen model)
8. Seller can **freely correct contact fields** (address, VAT number, legal name), edited **in our
   system** for display/contact — **do not write these back to Stripe**.
9. **Identity keys** (personnummer/org.nr/DOB) are changed via an **approved correction request**:
   the platform approves; the platform stays in control of the reportable identifier.
10. An approved identity-key change should **route the seller to update it at Stripe** (re-runs
    KYC) rather than overwriting a verified value in our DB.

### E. Transparency
11. **Notify each reported seller** of what is reported about them (DAC7 transparency
    requirement). This is a notice to the seller — separate from giving them the export tool.

## Acceptance criteria
- [ ] Stripe DAC7/"platform tax reporting" feature evaluated; findings documented.
- [ ] Seller due-diligence fields stored (legal name, tax ID, VAT, address, country, DOB).
- [ ] Identifiers sourced from Stripe KYC; manual form is fallback-only and per-seller-scoped.
- [ ] Per-seller per-calendar-year gross + transaction count computed.
- [ ] De-minimis (<30 AND ≤ EUR 2,000) computed and stored, including for excluded sellers.
- [ ] Reportable-seller export exists (or Stripe export wired up).
- [ ] Aggregation/report/export are platform-admin-only; sellers cannot reach them.
- [ ] No seller can view another seller's data (verified).
- [ ] Seller can correct contact fields directly; identity keys go through approved request.
- [ ] Contact-field edits are NOT written back to Stripe; identity-key changes route to Stripe.
- [ ] Each reported seller receives a transparency notice of what is reported.

## Out of scope / depends on
- Skatteverket registration (manual). Final field list / formats to be confirmed with the jurist
  and against Stripe's export.
