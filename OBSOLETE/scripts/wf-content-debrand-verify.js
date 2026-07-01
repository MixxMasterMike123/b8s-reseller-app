export const meta = {
  name: 'content-debrand-verify',
  description: 'Adversarial inverse-audit of the B8Shield content de-brand: confirm no user-visible brand remains, the shopName substitution is wired correctly, social/Trustpilot are admin-editable + default-empty, and no behavior/import broke.',
  phases: [
    { title: 'Audit', detail: 'parallel skeptics over each de-branded area' },
    { title: 'Sweep', detail: 'final inverse-audit grep + build across the whole src tree' },
  ],
}
const REPO = '/Users/mikaelohlen/Cursor Apps/b8shield_portal'

const VERDICT_SCHEMA = {
  type:'object', additionalProperties:false, required:['area','verdict','checks','mustFix'],
  properties:{
    area:{type:'string'},
    verdict:{type:'string', enum:['CLEAN','FIX_FIRST']},
    checks:{type:'array', items:{type:'string'}},
    mustFix:{type:'array', items:{type:'object', additionalProperties:false, required:['title','detail','fix'], properties:{title:{type:'string'},detail:{type:'string'},fix:{type:'string'}}}},
  },
}

const areas = [
  {
    area: 'AffiliateSuccessGuide (live affiliate portal) + shopName wiring',
    prompt: `File: src/components/affiliate/AffiliateSuccessGuide.jsx (rendered in AffiliatePortal 'success' tab). Verify: (1) NO literal "B8Shield" remains in any user-visible string (only an explanatory comment is allowed). (2) It imports useStoreSettings and computes brand = store?.shopName || fallback. (3) Every t() call that used to say "B8Shield" now uses {{brand}} in its default AND passes { brand } as the 3rd arg, so TranslationContext's interpolation substitutes it (read TranslationContext t() signature to confirm {{var}} works). (4) No t() call is malformed (missing the variables arg where {{brand}} appears). (5) Build ok.`,
  },
  {
    area: 'Store Identity: social + Trustpilot admin-editable + default-empty',
    prompt: `Files: src/config/store.js, src/pages/admin/AdminSettings.jsx, src/config/socialMedia.js, src/components/SocialMediaShare.jsx, src/utils/trustpilotAPI.js, src/components/TrustpilotWidget.jsx. Verify: (1) STORE has social{} and trustpilot{domain,email} all defaulting to '' (empty). (2) AdminSettings renders editable inputs for the social links AND the new Trustpilot domain/email, wired to storeForm + saveStoreIdentity (saveShopConfig) — confirm the save path is intact. (3) socialMedia.js SOCIAL_MEDIA_LINKS no longer contains any hardcoded b8shield profile URL (all url:'' ), and generateShareContent takes a brand arg. (4) SocialMediaShare reads follow links from store.social (not hardcoded) and only shows platforms with a set URL; the "Follow" heading uses shopName/neutral, no "B8Shield". (5) trustpilotAPI DOMAIN/BUSINESS_EMAIL are '' and findBusinessUnit early-returns on empty domain; TrustpilotWidget REVIEW_URL derives from the domain prop (no hardcoded b8shield.com). (6) Build ok.`,
  },
  {
    area: 'ProductSocialShare + WritersWagon + productImages + ambassador',
    prompt: `Files: src/components/ProductSocialShare.jsx, src/wagons/writers-wagon/api/WritersWagonAPI.js, src/wagons/writers-wagon/api/WritersWagonConfig.js, src/utils/productImages.js, src/wagons/ambassador-wagon/components/AmbassadorActivityCenter.jsx. Verify: (1) ProductSocialShare: no literal "B8Shield"/"shop.b8shield.com" remains; share text/hashtags/title-fallback use brand=store.shopName; getProductImage call still works. (2) WritersWagonAPI getBrandContext is now brand-parameterized/neutral (no hardcoded B8Shield/JPH), and its single caller (line ~125) still compiles (called with no args → returns '' is fine). The seo-optimizer keyword line is de-fished. (3) WritersWagonConfig: the b8shield BRAND_VOICE key is removed and getBrandVoice('default') still works (no dangling reference to the removed key). (4) productImages generateProductImage draws product-name initials (no 'B8'/'SHIELD'); getProductImage fallbacks pass '' not 'B8Shield'; getProductImage is still exported + used by CartContext/PublicProductPage without breakage. (5) ambassador placeholder no longer says B8Shield. (6) Build ok.`,
  },
  {
    area: 'Deletions: TrainingModal + ProductDetailPopup gone cleanly',
    prompt: `Verify the dead cluster deletion. (1) src/components/TrainingModal.jsx and src/components/ProductDetailPopup.jsx no longer exist. (2) grep the whole src/ for any remaining import of either — there must be NONE (a dangling import would break the build). (3) The three extract scripts (scripts/extract-all-translation-keys.js, .cjs, extract-b2b-hardcoded-text.cjs) no longer list the deleted files AND remain syntactically valid arrays (no trailing-comma/bracket breakage — eyeball the array end). (4) Build passes (npm run build 2>&1 | tail -3).`,
  },
]

phase('Audit')
const verdicts = await parallel(areas.map((a) => () =>
  agent(`READ-ONLY adversarial audit of a B8Shield CONTENT de-brand. Do NOT edit. Working dir: ${REPO}.
Goal of the de-brand: no user-visible "B8Shield"; brand references replaced by the shop name (store.shopName via useStoreSettings); social + Trustpilot moved to admin-editable Store Identity (default empty). Internal data keys (shopId 'b8shield', localStorage keys, the B8SHIELD reserved affiliate code) are INTENTIONALLY KEPT — do not flag those.

AREA: ${a.area}
${a.prompt}

Read the files, run \`cd ${REPO} && npm run build 2>&1 | tail -3\`. Report VERDICT 'CLEAN' or 'FIX_FIRST' with specific mustFix (quote exact lines). Be skeptical — a malformed t() interpolation, a dangling import from the deletion, or a hardcoded brand still rendering = FIX_FIRST.`,
    { label: `audit:${a.area.slice(0,30)}`, phase: 'Audit', agentType: 'general-purpose', schema: VERDICT_SCHEMA }
  )
))

phase('Sweep')
const sweep = await agent(`Final inverse-audit sweep for the B8Shield content de-brand. Working dir: ${REPO}. Do NOT edit.
Area verdicts:
${JSON.stringify(verdicts.filter(Boolean), null, 2)}

Do the cross-cutting checks:
1. Run \`cd ${REPO} && grep -rniE "b8shield" src/ | grep -viE "shopId|DEFAULT_SHOP_ID|'b8shield'|b8shield_cart|b8shield-language|b8shield-country|b8shield-credential|b8shield-reseller|B8SHIELD'|//|/\\*|\\* "\`. For EACH remaining hit, classify: is it user-visible copy (a GAP), an AI-prompt/keyword, demo/seed data, a config default, a comment, or an intentional-keep (data key/localStorage/reserved code)? List only genuine USER-VISIBLE gaps.
2. Confirm no dangling imports of the deleted TrainingModal/ProductDetailPopup anywhere.
3. Run \`cd ${REPO} && npm run build 2>&1 | tail -4\` — whole app builds.
4. Note (do not fix): src/utils/trustpilotDemo.js reportedly contains a plaintext Trustpilot password — confirm it's there and flag it for the user as a security item (separate from branding).
Report a concise findings list + final GO / NO-GO on the content de-brand. Distinguish real user-visible gaps from intentional keeps.`,
  { label: 'final-sweep', phase: 'Sweep', agentType: 'general-purpose' }
)

return { verdicts: verdicts.filter(Boolean), sweep }
