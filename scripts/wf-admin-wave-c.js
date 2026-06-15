export const meta = {
  name: 'admin-redesign-wave-c',
  description: 'Redesign 11 admin EDIT/CREATE/VIEW pages (heavy forms + analytics + storefront) to the Admin Neutral/Shopify design, parallel, each adversarially verified — money/permission logic preserved byte-identical',
  phases: [
    { title: 'Redesign', detail: 'one agent per page → RightRail + CardSection + Field form grammar' },
    { title: 'Verify', detail: 'adversarial behavior-preservation review per page (money/permission focus)' },
  ],
}
const REPO = '/Users/mikaelohlen/Cursor Apps/b8shield_portal'

const REDESIGN_SCHEMA = {
  type:'object', additionalProperties:false, required:['file','summary','behaviorsPreserved','risks'],
  properties:{
    file:{type:'string'},
    summary:{type:'string'},
    behaviorsPreserved:{type:'array', items:{type:'string'}},
    risks:{type:'array', items:{type:'string'}},
  },
}
const VERDICT_SCHEMA = {
  type:'object', additionalProperties:false, required:['file','verdict','mustFix'],
  properties:{
    file:{type:'string'},
    verdict:{type:'string', enum:['CLEAN','FIX_FIRST']},
    mustFix:{type:'array', items:{type:'object', additionalProperties:false, required:['title','detail','fix'], properties:{title:{type:'string'},detail:{type:'string'},fix:{type:'string'}}}},
    defer:{type:'array', items:{type:'string'}},
  },
}

const PRIMITIVES = `The Admin Neutral / Shopify design system lives in src/components/admin/ui/ (import: \`from '../../components/admin/ui'\`):
- Page({title, subtitle, actions, back, children}) — page frame (title 20px). Form/content goes inside.
- RightRail({main, rail}) — TWO-COLUMN form layout: primary form in \`main\`, secondary metadata/status in \`rail\`. THE template for edit/create pages.
- Card / CardSection({title, actions?, bodyClassName?, children}) — bordered surface; CardSection has a titled header. Group form fields into titled sections.
- Field({label, htmlFor, help, error, required}) + Input/Textarea/Select — form controls. OR follow ProductForm's labelCls/inputCls pattern (admin tokens).
- MetricsBar({metrics:[{key,label,value,delta?,spark?}]}) — thin flat metric strip (for analytics/stat numbers, NOT big KPI cards).
- DataTable({columns,rows,rowKey,onRowClick,loading,empty,toolbar?,footer?}) — Shopify IndexTable (for any embedded lists, e.g. payout history).
- StatusPill({tone:'success'|'warning'|'info'|'danger'|'neutral', marker?}) — desaturated badge w/ dot.
- Button({variant:'primary'|'secondary'|'plain'|'destructive', as?, ...}) — primary=near-black #303030. Save=primary, Cancel=secondary, Delete=destructive.
Tokens: bg-admin-bg/surface/surface-2, border-admin-border/-soft, text-admin-text/-muted/-faint, radius var(--radius-admin)=8 / -el=6. Body 13px. NO per-shop accent.
LIVE TEMPLATES to copy (READ FIRST):
- src/components/admin/ProductForm.jsx — THE form template: RightRail (main=Produkt/Media/Pris/Varianter CardSections, rail=Status/Publicering/Organisation), labelCls/inputCls pattern, Button save/cancel.
- src/pages/admin/AdminOrderDetail.jsx — RightRail detail grammar (main cards + rail Customer/Order-info cards).
- src/pages/admin/AdminProducts.jsx / AdminOrders.jsx — list grammar (only if the page embeds a table).`

const RULES = `RULES — THIS IS A HIGH-STAKES WAVE (money + permissions):
1. PRESERVE ALL BEHAVIOR BYTE-IDENTICAL — every data fetch, useEffect, form state, validation, submit handler, callable/Firestore write, money calc, role/permission grant, toast, navigation, guard, and confirm dialog MUST keep working identically. This is a VISUAL RESKIN ONLY. Do NOT change any logic, query, shopId scoping, field name, data shape, validation bound, or write payload. Touch presentational JSX + className only.
2. Be EXTRA careful with: payout amounts/balance, commissionRate, checkoutDiscount, marginal %, role (admin/customer) grants, status transitions, Stripe/affiliate writes. If a field is read or written, it MUST still be read/written with the same value. Do NOT drop any input, checkbox, or select that maps to a saved field.
3. Keep AppLayout as the outer wrapper. Replace the inner container + old blue/gray styled blocks with the primitives. Use RightRail for the form (main = the editable fields grouped into CardSections; rail = status/meta/danger-zone). Drop old breadcrumbs → use Page title/back. Save→primary Button, Cancel→secondary, Delete→destructive.
4. Match AdminOrders/ProductForm density (13px). Map status colors to StatusPill tones (green→success, blue→info, yellow→warning, red→danger, gray→neutral). Any embedded list (e.g. payout history, analytics rows) → DataTable.
5. Build must pass (\`npm run build\`). No undefined tokens. Remove only imports you genuinely orphan; keep every import still used. Preserve ContentLanguageIndicator / translation wiring verbatim where present.
6. Edit the file in place. Report via StructuredOutput — list EVERY money/permission field you confirmed still wired.`

const pages = [
  { file: 'src/pages/admin/AdminAffiliateEdit.jsx', route: '/admin/affiliates/manage/:id and /admin/affiliates/:id (edit). 1420 lines.', note: 'Affiliate EDIT form: profile (name/email/website/phone), affiliateCode, commissionRate, checkoutDiscount, status, payment/bank details, stats display, notes, delete. HIGHEST STAKES — commissionRate + checkoutDiscount are money fields edited here; status transitions; possible Stripe/bank fields. Form → RightRail (main=editable CardSections, rail=Status + stats + danger-zone delete). Preserve EVERY field<->state<->save mapping, all validation, the delete confirm, and all navigation.' },
  { file: 'src/pages/admin/AdminAffiliateCreate.jsx', route: '/admin/affiliates/create. 452 lines.', note: 'Affiliate CREATE form: same field set as edit (name/email/code/commissionRate/checkoutDiscount/status/...), createAffiliate write + success nav back to /admin/affiliates. Form → RightRail. Preserve every field, validation, the create write payload, and post-create navigation/toasts.' },
  { file: 'src/pages/admin/AdminAffiliatePayout.jsx', route: '/admin/affiliates/payout/:id. 424 lines.', note: 'Affiliate PAYOUT page: shows unpaid balance, payout amount input, mark-as-paid write, payout history list. EXTREME care with the money amount + the mark-paid write. Form/summary → RightRail (main=payout form + history DataTable, rail=balance summary). Preserve the amount calc, the payout write payload, history fetch, and all confirms/toasts/navigation.' },
  { file: 'src/pages/admin/AdminAffiliateAnalytics.jsx', route: '/admin/affiliates/analytics. 647 lines.', note: 'Affiliate ANALYTICS VIEW (not a form): aggregate stats, charts, per-affiliate breakdown table. Reskin to Page + MetricsBar (for the top aggregate numbers) + Card/CardSection wrapping any charts + DataTable for the breakdown table. Preserve ALL data aggregation, the charts (keep the chart lib usage intact — only restyle wrappers), and any date-range/filter controls. Do NOT alter computation.' },
  { file: 'src/pages/admin/AdminUserEdit.jsx', route: '/admin/users/:userId/edit. 1426 lines.', note: 'Admin/customer USER EDIT — HIGHEST STAKES (permissions). Edits role (admin<->customer), marginal %, company/contact details, possibly credentials/active flags. role grant + marginal are sacred. Form → RightRail (main=details CardSections, rail=Role/Status + danger-zone). Preserve EVERY field<->save mapping, the role-change confirm + updateUserRole, the marginal validation (0-100) + updateUserMarginal, all toasts + navigation. Do NOT change any permission logic.' },
  { file: 'src/pages/admin/AdminUserCreate.jsx', route: '/admin/users/create. 656 lines.', note: 'Admin user CREATE form: email/password/company/contact/role/marginal, create-user write (likely a callable that creates the auth user + Firestore doc). Form → RightRail. Preserve the create payload EXACTLY (email/password/role/marginal/etc.), all validation, post-create navigation + toasts.' },
  { file: 'src/pages/admin/AdminB2CCustomerEdit.jsx', route: '/admin/b2c-customers/:customerId. 869 lines.', note: 'B2C customer EDIT form: name/email/phone/address, marketing consent, customerSegment, notes, possibly order summary. Form → RightRail (main=details, rail=segment/consent/meta). shopId-scoped. Preserve every field<->save mapping, the b2cCustomers write, marketing-consent + segment fields, and navigation.' },
  { file: 'src/pages/admin/AdminPageEdit.jsx', route: '/admin/pages/:id and /admin/pages/new. 594 lines.', note: 'CMS page EDIT/CREATE form: title/slug/content (rich text or markdown)/status(published-draft)/SEO. Uses ContentLanguageIndicator + useContentTranslation (multi-language content) — preserve VERBATIM. Form → RightRail (main=title/slug/content, rail=Status/publish + SEO). shopId-scoped write. Preserve the slug logic, content translation wiring, publish toggle, save + delete, navigation.' },
  { file: 'src/pages/admin/AdminMarketingMaterialEdit.jsx', route: '/admin/marketing/:id/edit. 421 lines.', note: 'Marketing material EDIT form: name/description/category, file replace?, ContentLanguageIndicator for name/description. Form → RightRail or single Card (main=fields, rail=meta/preview). Preserve the update write, file handling, translation wiring, navigation.' },
  { file: 'src/pages/admin/AdminCustomerMarketingMaterialEdit.jsx', route: '/admin/customers/:customerId/marketing/:id/edit. 427 lines.', note: 'Customer-specific marketing material EDIT — same pattern as AdminMarketingMaterialEdit but with customerId param. Preserve customerId wiring, the customer-material update write, translation wiring, navigation back to the customer marketing list.' },
  { file: 'src/pages/admin/AdminStorefront.jsx', route: '/admin/storefront. 566 lines. ALREADY NORD-styled.', note: 'Storefront settings — ALREADY partially styled (NORD). Reskin to MATCH the Admin Neutral system used by ProductForm/Orders: Page frame, CardSection groups, Field/Input, near-black primary Button, 13px density, admin tokens (drop any NORD-specific accent/color in favor of the neutral admin palette). Preserve every setting field<->save mapping (hero/theme/banner/featured/etc.), the storefront config write, and navigation. This is purely bringing it into visual consistency.' },
]

phase('Redesign')
const redesigns = await parallel(pages.map((p) => () =>
  agent(`${PRIMITIVES}

${RULES}

YOUR TASK: redesign ${p.file} to the Admin Neutral / Shopify design.
ROUTE: ${p.route}
${p.note}

Read the FULL current file first (in ${REPO}) — it is large; read all of it before editing. Read src/components/admin/ProductForm.jsx (the form template) + AdminOrderDetail.jsx (RightRail detail). Then rewrite the presentational JSX in place, preserving every behavior byte-identical (especially money + permission writes). Build with \`cd ${REPO} && npm run build 2>&1 | tail -5\` and fix any error before reporting. Report StructuredOutput — in behaviorsPreserved, explicitly list every money/permission field still wired.`,
    { label: `redesign:${p.file.split('/').pop()}`, phase: 'Redesign', agentType: 'general-purpose', schema: REDESIGN_SCHEMA }
  )
))

phase('Verify')
const verdicts = await parallel(pages.map((p, i) => () =>
  agent(`READ-ONLY adversarial review. Do NOT edit. Working dir: ${REPO}.
A redesign agent reskinned ${p.file} to the Admin Neutral design (visual-only; behavior MUST be preserved byte-identical). ROUTE: ${p.route}. Its self-report:
${JSON.stringify(redesigns[i], null, 2)}

Run \`cd ${REPO} && git diff ${p.file}\` and read the FULL current file + the original (\`git show HEAD:${p.file}\`). Be SKEPTICAL — this wave carries money + permission logic. Verify:
1. EVERY data fetch / useEffect / query / shopId scoping unchanged in logic.
2. EVERY form field that maps to a saved value is still present AND still bound to the same state AND still written with the same value (no dropped input/checkbox/select). Cross-check the submit/write payload against the original — same fields, same shape, same bounds.
3. MONEY + PERMISSION integrity: commissionRate, checkoutDiscount, payout amount/balance, marginal, role grants, status transitions, Stripe/affiliate/user writes — all byte-identical. ANY drift here = FIX_FIRST.
4. EVERY handler, validation, confirm dialog, toast, navigation, guard preserved + reachable. ContentLanguageIndicator/translation wiring intact where it existed.
5. Build passes (\`npm run build 2>&1 | tail -3\`). No undefined admin token; no orphaned imports; no dropped functionality.
6. Uses the admin/ui primitives (RightRail/CardSection/Field/Button) + matches ProductForm density (not the old blue/gray or NORD look).
Report VERDICT 'CLEAN' or 'FIX_FIRST' with specific mustFix (quote the dropped/changed field + original line). Don't invent issues, but treat any unverified money/permission field as a mustFix.`,
    { label: `verify:${p.file.split('/').pop()}`, phase: 'Verify', agentType: 'general-purpose', schema: VERDICT_SCHEMA }
  )
))

return { pages: pages.map((p, i) => ({ file: p.file, redesign: redesigns[i], verdict: verdicts[i] })) }
