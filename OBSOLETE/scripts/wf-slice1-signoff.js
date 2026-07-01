export const meta = {
  name: 'slice1-signoff',
  description: 'Final slice-1 sign-off: byte-level money/permission parity audit of the 7 write-bearing Wave A/B admin pages (Orders, OrderDetail, Users, Settings, Affiliates, Pages, Products) + a cross-cutting consistency critic across the whole admin',
  phases: [
    { title: 'Parity', detail: 'one skeptic per write-bearing page → diff e2e84ed→HEAD, prove writes byte-identical' },
    { title: 'Consistency', detail: 'cross-cutting design-uniformity + old-design sweep across all admin pages' },
  ],
}
const REPO = '/Users/mikaelohlen/Cursor Apps/b8shield_portal'
const BASE = 'e2e84ed' // last commit before the admin redesign began (verified: all 7 files had old design here)

const VERDICT_SCHEMA = {
  type:'object', additionalProperties:false, required:['file','verdict','writesAudited','mustFix'],
  properties:{
    file:{type:'string'},
    verdict:{type:'string', enum:['CLEAN','FIX_FIRST']},
    writesAudited:{type:'array', items:{type:'string'}, description:'every write/callable/status-transition/permission op confirmed byte-identical, with how verified (orig vs current)'},
    mustFix:{type:'array', items:{type:'object', additionalProperties:false, required:['title','detail','fix'], properties:{title:{type:'string'},detail:{type:'string'},fix:{type:'string'}}}},
    defer:{type:'array', items:{type:'string'}},
  },
}

const files = [
  { f: 'src/pages/admin/AdminOrders.jsx', focus: 'updateOrderStatus(orderId,newStatus) inline from the list; isOrderPaid derivation; any payment/verification gating; getAllOrders fetch + shopId scoping; the derived payment pill must not change which orders read as paid.' },
  { f: 'src/pages/admin/AdminOrderDetail.jsx', focus: 'updateOrderStatus(orderId,newStatus), deleteOrder(orderId) (+confirm guard), the payment-summary money math (Delsumma/affiliate-rabatt/Frakt/Moms/Totalt, sek() helper), handleRetry, handlePrint/handlePrintLabel, status-history writes. The displayed order total must equal the original computation exactly.' },
  { f: 'src/pages/admin/AdminUsers.jsx', focus: 'PERMISSION: updateUserRole(userId,newRole) (admin<->customer grant, +confirm), updateUserMarginal(userId,marginalNum) (money, 0-100 validation). Hidden B2B tab must stay hidden. users collection global (no shopId).' },
  { f: 'src/pages/admin/AdminSettings.jsx', focus: 'saveShopConfig/saveStoreIdentity (shop tax/shipping/currency/VAT/money config), the wagon setDoc({merge:true}) per-user toggles, toggleWagonForUser, PickupLocationsEditor wiring. Any drift here changes shop money/tax behavior.' },
  { f: 'src/pages/admin/AdminAffiliates.jsx', focus: 'approveAffiliate callable + handleApprove payload, handleDeny deleteDoc, both list fetches shopId-scoped, the checkoutDiscount/commissionRate display I re-added in Wave B, payout-balance gating of the Betala button, the external ?ref= link construction.' },
  { f: 'src/pages/admin/AdminPages.jsx', focus: 'deleteDoc(confirm), shopId-scoped query + the index-fallback query, onSnapshot listener, publish/status + translation-completeness logic, create nav.' },
  { f: 'src/pages/admin/AdminProducts.jsx', focus: 'product delete (deleteDoc/handler), row→edit nav, the ProductForm host wrapper, shopId scoping, availability filter — no money write here but confirm delete + the b2cPrice||basePrice display read are unchanged.' },
]

phase('Parity')
const verdicts = await parallel(files.map((p) => () =>
  agent(`READ-ONLY adversarial money/permission PARITY audit. Do NOT edit. Working dir: ${REPO}.
Context: this admin page was VISUALLY reskinned to the Admin Neutral/Shopify design across the redesign (Wave A/B). It passed a behavior-preservation verifier in its own wave, but never got a dedicated byte-level money/permission audit. You provide that now — timing-proof, by diffing the true pre-redesign baseline (${BASE}) to HEAD.

TARGET: ${p.f}
FOCUS (money/permission/write surface): ${p.focus}

Steps:
1. Run \`cd ${REPO} && git diff ${BASE} -- ${p.f}\`. Read the full current file and \`git show ${BASE}:${p.f}\` (the original).
2. The redesign was meant to be VISUAL ONLY. Prove that EVERY write, callable, status transition, permission grant, money calculation, validation bound, data fetch, shopId scoping, guard, confirm dialog, toast, and navigation is byte-identical in LOGIC — only JSX/className/layout/imports may differ. Extract each handler from both versions and compare.
3. For each write/permission op in FOCUS, confirm the payload (field names, shape, bounds, parse/fallback) is unchanged. A reskin that changed which orders read as 'paid', which status a transition writes, what role/margin is granted, or what shop-config is saved = FIX_FIRST.
4. List every such op in writesAudited with how you verified it (quote orig vs current).
Report VERDICT 'CLEAN' or 'FIX_FIRST'. Be skeptical; treat any unverifiable write or any logic drift as FIX_FIRST with exact quoted lines.`,
    { label: `parity:${p.f.split('/').pop()}`, phase: 'Parity', agentType: 'general-purpose', schema: VERDICT_SCHEMA }
  )
))

phase('Consistency')
const critic = await agent(`Cross-cutting consistency critic for the WHOLE admin redesign. Working dir: ${REPO}. Do NOT edit.
The redesign reskinned every admin page to the Admin Neutral/Shopify design (src/components/admin/ui primitives: Page, DataTable, MetricsBar, RightRail, Card/CardSection, Field, StatusPill, Button + dark top bar + 13px density). Money/permission parity for the 7 write-bearing pages was just audited:
${JSON.stringify(verdicts.filter(Boolean).map(v => ({file:v.file, verdict:v.verdict, mustFix:v.mustFix})), null, 2)}

Your job — find cross-cutting INCONSISTENCY or gaps the per-page audits can't see:
1. Old-design leftovers: \`cd ${REPO} && grep -rlE 'bg-blue-[0-9]|bg-gray-50|from-blue|text-gray-700' src/pages/admin/ src/components/admin/\`. For each hit, open it and decide: genuine old-design chrome (a gap) vs. a semantic status-pill color (acceptable). List genuine gaps only.
2. Primitive consistency: do all admin pages import from 'components/admin/ui'? Any page hand-rolling a table/card/button instead of using DataTable/Card/Button? \`grep -rL "admin/ui" src/pages/admin/*.jsx\` (files NOT importing the barrel) — for each, is that correct (e.g. a pure redirect) or a missed page?
3. Token consistency: any hardcoded hex colors or non-admin tokens in admin pages that should use the admin-* tokens?
4. Shell/layout: every admin page rendered inside AppLayout? Any double-padding or missing Page frame?
5. Build the whole app: \`cd ${REPO} && npm run build 2>&1 | tail -4\`.
Report a concise plain-text findings list + a final GO / NO-GO on declaring the admin redesign (slice 1) DONE. Distinguish real gaps from acceptable false-positives.`,
  { label: 'consistency-critic', phase: 'Consistency', agentType: 'general-purpose' }
)

const failed = files.filter((p, i) => !verdicts[i]).map((p) => p.f)
return { verdicts: verdicts.filter(Boolean), failed, critic }
