export const meta = {
  name: 'admin-redesign-wave-b',
  description: 'Redesign 6 admin LIST pages (Affiliates, B2CCustomers, Marketing, CustomerMarketing, Pages, Users) to the Admin Neutral/Shopify design, parallel, each adversarially verified',
  phases: [
    { title: 'Redesign', detail: 'one agent per list page → Page + DataTable' },
    { title: 'Verify', detail: 'adversarial behavior-preservation review per page' },
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
- Page({title, subtitle, actions, back, children}) — page frame (title 20px). Content goes inside.
- MetricsBar({metrics:[{key,label,value,delta?,spark?}]}) — thin flat metric strip (NOT big KPI cards).
- DataTable({columns,rows,rowKey,onRowClick,loading,empty,toolbar?,footer?,selection?}) — Shopify IndexTable. columns=[{key,header,render(row),align?,className?,width?}]. toolbar renders inside the card top (use for search/filter); footer for pagination.
- ViewTabs/InlineSearch/Pagination from the same barrel for the in-card toolbar (see AdminOrders).
- RightRail({main, rail}); Card / CardSection({title, actions?, bodyClassName?}); Field + Input/Textarea/Select.
- StatusPill({tone:'success'|'warning'|'info'|'danger'|'neutral', marker?}) — desaturated badge w/ dot.
- Button({variant:'primary'|'secondary'|'plain'|'destructive', as?, ...}) — primary=near-black.
Tokens: bg-admin-bg/surface/surface-2, border-admin-border/-soft, text-admin-text/-muted/-faint, radius var(--radius-admin)=8 / -el=6. Body 13px. NO per-shop accent.
LIVE TEMPLATES to copy (read first): src/pages/admin/AdminOrders.jsx (list: Page+MetricsBar?+DataTable w/ toolbar+footer), src/pages/admin/AdminProducts.jsx (IndexTable w/ row-click→edit + trailing delete + toolbar filter).`

const RULES = `RULES:
1. PRESERVE ALL BEHAVIOR — every data fetch, useEffect, handler, filter, search, tab, link, guard, toast, navigation, pagination must keep working identically. Visual reskin ONLY. Do NOT change logic, queries, shopId scoping, or data shape.
2. Keep AppLayout as the outer wrapper. Replace the inner container + old blue/gray blocks with the primitives.
3. Match AdminOrders density (13px, tight rows). Use DataTable for the main list. Put existing search/filter controls into the DataTable toolbar slot. Status → StatusPill (map existing colors to tones: green→success, blue→info, yellow→warning, red→danger, gray→neutral). Row actions: prefer row-click→detail/edit + a trailing icon action; keep every action reachable.
4. Drop old breadcrumbs; use Page title/back. Primary "create/add" action → Page actions (primary Button).
5. Build must pass. No undefined tokens. Keep all imports used (remove ones you orphan).
6. Edit the file in place. Report via StructuredOutput.`

const pages = [
  { file: 'src/pages/admin/AdminAffiliates.jsx', note: 'Affiliate list: pending applications + active affiliates, stat cards (clicks/conversions), approve/reject, view/edit/delete, create link. Stat cards → MetricsBar; the list(s) → DataTable. Keep approve/reject handlers, all navigation (/admin/affiliates/create, /manage/:id, /application/:id, /analytics, /payout/:id), shopId scoping, toasts.' },
  { file: 'src/pages/admin/AdminB2CCustomers.jsx', note: 'B2C customer list, shop-scoped; segment filter (all / with orders / marketing consent); real-time stats (orders, spent). Filter → ViewTabs or toolbar; list → DataTable; row→/admin/b2c-customers/:id. Preserve the segment filter logic + stats fetch.' },
  { file: 'src/pages/admin/AdminMarketingMaterials.jsx', note: 'Marketing material CRUD list (images/PDFs), per-shop; add/edit/delete + navigation to /admin/marketing/:id/edit. List → DataTable; keep upload/preview/delete + shopId scoping.' },
  { file: 'src/pages/admin/AdminCustomerMarketingMaterials.jsx', note: 'Customer-specific marketing materials (route /admin/customers/:customerId/marketing). Same pattern as AdminMarketingMaterials → DataTable; preserve the customerId param + all CRUD + navigation to the edit route.' },
  { file: 'src/pages/admin/AdminPages.jsx', note: 'CMS page list: create/edit dynamic storefront pages (title/slug/content). List → DataTable; row→/admin/pages/:id; keep create + delete + any publish/status, shopId scoping.' },
  { file: 'src/pages/admin/AdminUsers.jsx', note: 'Admin user list (the B2B-customer tab is HIDDEN — do not re-add it). Add/edit/delete admins; role toggle admin<->customer; navigation to /admin/users/create and /admin/users/:userId/edit. List → DataTable; preserve the role toggle + delete + the hidden-B2B state + (note: users collection is global, NOT shopId-scoped by design).' },
]

phase('Redesign')
const redesigns = await parallel(pages.map((p) => () =>
  agent(`${PRIMITIVES}

${RULES}

YOUR TASK: redesign ${p.file} to the Admin Neutral / Shopify design.
${p.note}

Read the full current file first (in ${REPO}). Read AdminOrders.jsx + AdminProducts.jsx as the list templates. Then rewrite the presentational JSX in place, preserving every behavior. Build with \`cd ${REPO} && npm run build 2>&1 | tail -5\` and fix any error before reporting. Report StructuredOutput.`,
    { label: `redesign:${p.file.split('/').pop()}`, phase: 'Redesign', agentType: 'general-purpose', schema: REDESIGN_SCHEMA }
  )
))

phase('Verify')
const verdicts = await parallel(pages.map((p, i) => () =>
  agent(`READ-ONLY adversarial review. Do NOT edit. Working dir: ${REPO}.
A redesign agent reskinned ${p.file} to the Admin Neutral design (visual-only; behavior must be preserved). Its self-report:
${JSON.stringify(redesigns[i], null, 2)}

Run \`cd ${REPO} && git diff ${p.file}\` and read the full current file. Verify:
1. EVERY data fetch / useEffect / query (esp. shopId scoping where it existed) unchanged in logic.
2. EVERY handler, filter, search, tab, link, navigation, guard, toast, pagination preserved + reachable.
3. Build passes (\`npm run build 2>&1 | tail -3\`).
4. No undefined admin token; no orphaned imports; no dropped functionality.
5. Uses the admin/ui primitives + matches Orders density (not the old blue/gray look).
Report VERDICT 'CLEAN' or 'FIX_FIRST' with specific mustFix. Be skeptical; don't invent issues.`,
    { label: `verify:${p.file.split('/').pop()}`, phase: 'Verify', agentType: 'general-purpose', schema: VERDICT_SCHEMA }
  )
))

return { pages: pages.map((p, i) => ({ file: p.file, redesign: redesigns[i], verdict: verdicts[i] })) }
