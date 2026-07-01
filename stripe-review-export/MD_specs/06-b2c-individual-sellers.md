# 06 — B2C / individual (privatperson) sellers

**Priority:** P1
**Status:** ✅ Specified — verify against acceptance criteria.

## Purpose
The platform should let **private individuals** open a shop, not only companies ("5-minute shop"
for everyone). Stripe Express already supports individual accounts; the app's data model and
onboarding must branch correctly.

## Current state (from the export)
Shop identity fields (`storeIdentity`: `legalName`, `orgNumber`, address, etc.) are
company-oriented; no explicit individual-vs-company branching.

## Requirements
1. Onboarding + `storeIdentity`/data model support an **individual** seller as well as a company.
2. Stripe Express account creation uses the correct business type for individuals.
3. DAC7 fields branch correctly: **personnummer** (individual) vs **org.nr** (company) — see 05.

## Acceptance criteria
- [ ] An individual can complete onboarding and run a shop.
- [ ] Data model distinguishes individual vs company seller.
- [ ] DAC7 identity field resolves to personnummer for individuals, org.nr for companies.

## Out of scope / depends on
- Consumer-protection terms for individual sellers are handled in the platform contract (a
  consumer-safe track / carve-outs), not in code.
