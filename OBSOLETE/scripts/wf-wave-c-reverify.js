export const meta = {
  name: 'wave-c-reverify',
  description: 'Adversarially re-verify all 11 Wave C files: diff true-original (e2e84ed) vs final on-disk state, money/permission integrity focus (commit-timing mess made the first verify pass untrustworthy)',
  phases: [
    { title: 'Reverify', detail: 'one skeptic per file → diff base..working, prove byte-identical writes' },
    { title: 'Critic', detail: 'completeness critic across all verdicts' },
  ],
}
const REPO = '/Users/mikaelohlen/Cursor Apps/b8shield_portal'
const BASE = 'e2e84ed' // last commit before any Wave C / ProductForm change

const VERDICT_SCHEMA = {
  type:'object', additionalProperties:false, required:['file','verdict','mustFix','moneyPermFields'],
  properties:{
    file:{type:'string'},
    verdict:{type:'string', enum:['CLEAN','FIX_FIRST']},
    moneyPermFields:{type:'array', items:{type:'string'}, description:'every money/permission field you confirmed still read+written identically (name + how verified)'},
    mustFix:{type:'array', items:{type:'object', additionalProperties:false, required:['title','detail','fix'], properties:{title:{type:'string'},detail:{type:'string'},fix:{type:'string'}}}},
    defer:{type:'array', items:{type:'string'}},
  },
}

const files = [
  { f: 'src/pages/admin/AdminAffiliateEdit.jsx', focus: 'commissionRate, checkoutDiscount, status, affiliateCode write, send-credentials callable, approve/deny, delete. The updateDoc payload must be field-for-field identical.' },
  { f: 'src/pages/admin/AdminAffiliateCreate.jsx', focus: 'commissionRate (parseInt||15, min1 max50), checkoutDiscount (parseInt||10, min0 max50), status hardcoded inactive, the two-step addDoc+setDoc write, withShopId, all profile/social fields.' },
  { f: 'src/pages/admin/AdminAffiliatePayout.jsx', focus: 'payoutAmount (prefilled balance, max=balance bound), validateForm money bound, processAffiliatePayout(affiliateId,payoutData,shopId) payload {payoutAmount,invoiceNumber,invoiceUrl,invoiceFileName,notes,processedBy}, uploadInvoicePDF, auth guard.' },
  { f: 'src/pages/admin/AdminAffiliateAnalytics.jsx', focus: 'VIEW page — all aggregation/computation unchanged, charts intact, date-range/filter controls preserved. No writes.' },
  { f: 'src/pages/admin/AdminUserEdit.jsx', focus: 'HIGHEST STAKES — role grant (updateUserRole), marginal (updateUserMarginal, 0-100), toggleUserActive, updateAnyUserProfile, deleteCustomerAccount, sendCustomerWelcomeEmail. This file was caught mid-write by a commit — verify it is COMPLETE and coherent (no truncation, no dangling JSX) AND every permission write identical.' },
  { f: 'src/pages/admin/AdminUserCreate.jsx', focus: 'create-user payload (email/password/role/marginal/company/contact), all validation, post-create nav.' },
  { f: 'src/pages/admin/AdminB2CCustomerEdit.jsx', focus: 'b2cCustomers write, marketing consent, customerSegment, shopId scoping, every field<->save mapping.' },
  { f: 'src/pages/admin/AdminPageEdit.jsx', focus: 'slug logic, content translation (ContentLanguageIndicator/useContentTranslation), publish toggle, save+delete, shopId scoping. (Link import was just removed — confirm no remaining Link usage.)' },
  { f: 'src/pages/admin/AdminMarketingMaterialEdit.jsx', focus: 'update write, file handling, translation wiring, navigation.' },
  { f: 'src/pages/admin/AdminCustomerMarketingMaterialEdit.jsx', focus: 'customerId wiring, customer-material update write, translation wiring, nav. Was caught mid-write — verify COMPLETE + coherent.' },
  { f: 'src/pages/admin/AdminStorefront.jsx', focus: 'every storefront-config setting field<->save mapping, the config write, navigation. Was uncommitted/mid-write — verify COMPLETE + coherent + fully reskinned (no NORD leftovers).' },
]

phase('Reverify')
const verdicts = await parallel(files.map((p) => () =>
  agent(`READ-ONLY adversarial re-verification. Do NOT edit. Working dir: ${REPO}.
Context: 11 admin edit/create/view files were reskinned to the Admin Neutral design by a parallel workflow. A commit-timing mistake committed some mid-write, so the FIRST verify pass may have read incomplete files. You re-verify the TRUE final state.

TARGET FILE: ${p.f}
MONEY/PERMISSION FOCUS: ${p.focus}

Steps:
1. Run \`cd ${REPO} && git diff ${BASE} -- ${p.f}\` to see the FULL change from the true pre-redesign baseline (${BASE}) to the current working-tree state. Also read the full current file and \`git show ${BASE}:${p.f}\` (the original).
2. This was meant to be a VISUAL RESKIN ONLY. Prove that EVERY data fetch, useEffect, handler, validation, write payload (field-by-field, same names/shape/bounds), money calc, permission/role grant, toast, navigation, guard, and translation wiring is byte-identical in LOGIC. Only JSX/className/imports/layout may differ.
3. Confirm the file is COMPLETE: no truncation, no unclosed JSX, no duplicate default export, build-coherent. Run \`cd ${REPO} && npm run build 2>&1 | tail -3\` and confirm it passes (note: build is shared — a failure may be another file; if so, say so).
4. List in moneyPermFields EVERY money/permission field you confirmed still read+written identically, with how you verified it.
Report VERDICT 'CLEAN' or 'FIX_FIRST'. Treat ANY unverifiable money/permission write, ANY dropped field, or ANY truncation/incoherence as FIX_FIRST. Quote exact original vs current lines for any mustFix. Be skeptical.`,
    { label: `reverify:${p.f.split('/').pop()}`, phase: 'Reverify', agentType: 'general-purpose', schema: VERDICT_SCHEMA }
  )
))

phase('Critic')
const critic = await agent(`Completeness critic. Working dir: ${REPO}. Do NOT edit.
Here are 11 re-verification verdicts for the Wave C admin reskin:
${JSON.stringify(verdicts, null, 2)}

Your job: find what the per-file skeptics might have MISSED.
1. Are there any admin edit/create/view pages NOT in this list of 11 that should also have been reskinned? (Check src/pages/admin/ for any remaining file with bg-blue-/bg-gray-50/from-blue old-design markers via \`cd ${REPO} && grep -rl 'bg-blue-\\|bg-gray-50\\|from-blue' src/pages/admin/\`.)
2. Do any two files share a helper/import that one removed and the other still needs?
3. Run \`cd ${REPO} && npm run build 2>&1 | tail -4\` — does the whole app build?
4. Any file marked CLEAN whose moneyPermFields list looks suspiciously thin given its focus area?
Report a concise findings summary as plain text: list any gaps, any pages still on the old design, and a final GO / NO-GO for shipping all 11.`,
  { label: 'completeness-critic', phase: 'Critic', agentType: 'general-purpose' }
)

return { verdicts, critic }
