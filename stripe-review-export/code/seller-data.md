# Seller / shop-owner data the PLATFORM persists (for DAC7 due-diligence assessment)

The platform stores **minimal** seller data and **no statutory tax identifier, no personnummer, no DOB, no bank details, no ID documents**. Stripe collects KYC during Express onboarding; the platform stores only the resulting status flags. No data values are included here — schema only.

## `shops/{shopId}` — created at provisioning
**from: `src/components/platform/ProvisionShopModal.jsx` L68-79** (platform operator creates the shop):
```js
await setDoc(doc(db, 'shops', id), {
  name,                                  // shop display name (free text)
  storeIdentity: { shopName, accent },   // display name + UI accent colour
  status: 'active',
  features: DEFAULT_FEATURES,
  ownerUid: null,                        // owner-account assignment is a later slice
  createdAt: serverTimestamp(),
  provisionedVia: 'platform',
});
```
→ No seller identity captured at provisioning beyond a display name.

## `shops/{shopId}.storeIdentity` — shop-admin editable
**from: `src/pages/admin/AdminSettings.jsx`** (the shop owner fills these in; saved via `saveShopConfig` → `shops/{id}.storeIdentity`):
| Field | Meaning | Verified? |
|---|---|---|
| `legalName` | Juridiskt företagsnamn (legal company name) | No — free text |
| `orgNumber` | Organisationsnummer (org-nr) | No — free text, not validated |
| `businessInfo` | Footer business note (e.g. "Registrerad för F-skatt") | No |
| `address` | Address (HTML allowed) | No |
| `supportEmail` | Support email | No |
| `companyDescription` | Footer description | No |

→ These are self-declared footer/identity fields. **No tax-ID/VAT-nr field beyond the free-text `orgNumber`; no personnummer; no DOB.**

## `shops/{shopId}.payments` — Stripe status MIRROR (written by onboarding + `account.updated` webhook)
| Field | Source |
|---|---|
| `stripeAccountId` (acct_…) | Stripe (account create) |
| `chargesEnabled`, `payoutsEnabled`, `detailsSubmitted` | Stripe `account.updated` |
| `requirementsDue[]`, `connectStatus` | derived from Stripe account |
| `commissionBps` | platform-set (per-shop fee) |
| `connectEnabled` | platform-set (opt-in gate) |
| `onboardingStartedAt`, `onboardingCompletedAt`, `lastSyncedAt` | timestamps |

→ **No bank account, no tax ID, no identity data.** Just the Stripe account id + capability flags.

## `users/{uid}` — admin/owner login identity
`role` ('admin'|'user'), `shopId`, `platform` (super-admin bool), `email`, `active`. → The human operator is just an email + role; no statutory identity.

## DAC7 assessment notes
- The platform does **not** persist the seller's tax identifier, DOB, verified legal name, verified address, or financial-account identifier — those live with **Stripe** (Express KYC).
- There is **no per-seller aggregation** of gross consideration / transaction count / fees, and **no reporting export** (no DAC7/KU-format/1099 code) anywhere in the codebase.
- VAT is computed by the platform's own server into each order total (not via Stripe Tax), but there is no tax-reporting integration.
