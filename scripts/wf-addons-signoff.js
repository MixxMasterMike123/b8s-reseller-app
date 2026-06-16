export const meta = {
  name: 'addons-signoff',
  description: 'Final 3-way sign-off for the Wagons→Add-ons platform-control slice: verify platform↔admin↔shop chain end-to-end, default-ON invariant, and no regression to wagon behavior or the AdminSettings store-config path',
  phases: [
    { title: 'Audit', detail: 'parallel skeptics over the chain (rails, platform write, admin gate, AdminSettings removal)' },
    { title: 'Critic', detail: 'cross-cutting consistency + default-ON + GO/NO-GO' },
  ],
}
const REPO = '/Users/mikaelohlen/Cursor Apps/b8shield_portal'
const BASE = 'c59510c~1' // commit before add-ons S1 (true pre-slice baseline)

const VERDICT_SCHEMA = {
  type:'object', additionalProperties:false, required:['area','verdict','checks','mustFix'],
  properties:{
    area:{type:'string'},
    verdict:{type:'string', enum:['CLEAN','FIX_FIRST']},
    checks:{type:'array', items:{type:'string'}, description:'each thing you verified, with how'},
    mustFix:{type:'array', items:{type:'object', additionalProperties:false, required:['title','detail','fix'], properties:{title:{type:'string'},detail:{type:'string'},fix:{type:'string'}}}},
  },
}

const areas = [
  {
    area: 'Rails + default-ON invariant',
    prompt: `Verify the add-on RAILS and the critical DEFAULT-ON invariant.
Files: src/config/shopConfig.js (loadShopFeatures), src/config/addons.js (WAGON_FEATURE_KEY, ADDON_CATALOG, isFeatureEnabled), src/contexts/ShopFeaturesContext.jsx, src/components/addons/AddonGate.jsx.
Verify:
1. loadShopFeatures reuses the SAME probeTenantDoc cache as loadShopConfig (no extra Firestore read) and returns {} when the tenant doc / features field is missing.
2. isFeatureEnabled(features,key) returns TRUE for: undefined features, {} (the existing b8shield shop has NO features field), and a missing key. Returns FALSE only for an explicit false. THIS IS THE #1 INVARIANT — if a missing flag ever reads false, the existing shop loses all add-ons. Trace it precisely.
3. ShopFeaturesProvider degrades to {} (default-ON) on read error and is optimistic ({}) on first paint — no flash-hide.
4. AddonGate is optimistic while loading and only redirects on a known-off feature.
5. WAGON_FEATURE_KEY's 4 keys exactly match the 4 wagon manifest ids (ambassador-wagon/dining-wagon/campaign-wagon/writers-wagon) and ADDON_CATALOG covers them + affiliate.`,
  },
  {
    area: 'Platform write side (/addons)',
    prompt: `Verify the PLATFORM control UI writes correctly and is platform-only.
Files: src/pages/platform/PlatformAddons.jsx, src/components/platform/PlatformLayout.jsx, src/App.jsx (platform routes).
Verify:
1. toggleAddon writes shops/{id}.features.<key> via a DOT-PATH updateDoc so sibling feature flags are NOT clobbered (compare to PlatformShops.jsx toggleStatus pattern).
2. The toggle DISPLAY uses isFeatureEnabled (default-ON), so a shop with no features field shows every add-on as ON.
3. The /addons route is mounted under <PlatformRoute> (platform/super-admin only) and the nav item is live:true.
4. firestore.rules: the shops update rule allows isPlatform() to write features.* (read the match /shops block). Confirm no rule change was needed and platform CAN write.
5. Optimistic local update + error handling won't desync the displayed state from Firestore.`,
  },
  {
    area: 'Admin gate (menu + routes)',
    prompt: `Verify the ADMIN side reflects the per-shop feature (the platform→admin connection).
Files: src/components/layout/AppLayout.jsx (wagon menu loader + heading), src/App.jsx (wagon route mapping + AddonGate wrap).
Verify:
1. The AppLayout menu loader gates each wagon menu item by isAddonEnabled(WAGON_FEATURE_KEY[item.wagonId]) — a disabled add-on disappears from the menu; an unmapped wagon id still shows (no accidental hide).
2. The App.jsx wagon routes each wrap in <AddonGate feature={WAGON_FEATURE_KEY[wagonId]}> so a disabled add-on's DEEP LINK redirects to /admin (defense in depth). Ungated when no mapping.
3. The menu filter and the route gate use the SAME wagonId→feature-key map and the SAME isEnabled semantics (consistent — you can't have a visible menu item whose route is blocked, or vice versa, for the same flag state).
4. Heading is "Tillägg" (not "AI Vagnar") on BOTH desktop and mobile.
5. getRoutes() and getAdminMenuItemsSync() both stamp wagonId so the lookups resolve.`,
  },
  {
    area: 'AdminSettings removal (no regression)',
    prompt: `Verify the per-user wagon toggle was removed from AdminSettings WITHOUT breaking the store-config path. Diff against the baseline.
Run: cd ${REPO} && git diff ${BASE} -- src/pages/admin/AdminSettings.jsx
Verify:
1. The store-identity form path is INTACT: loadShopConfig seeds storeForm, saveStoreIdentity→saveShopConfig(storeForm) saves, PickupLocationsEditor + all field bindings preserved. This is the part that must NOT regress.
2. The loading gate still resolves (loading flips to false after the store-config load — confirm the page doesn't hang on a spinner now that loadData was removed).
3. All wagon handlers/state/imports are gone AND nothing dangling references them (no undefined: users, availableWagons, activeTab, wagonRegistry, currentUser, SegmentedTabs, StatusPill, CpuChipIcon).
4. userWagonSettings/{userId} is no longer WRITTEN by any app code (grep). The orphaned data + firestore rule are intentionally left (non-destructive) — that's fine, just confirm no write path remains.
5. Build passes.`,
  },
]

phase('Audit')
const verdicts = await parallel(areas.map((a) => () =>
  agent(`READ-ONLY adversarial audit for the Wagons→Add-ons slice. Do NOT edit. Working dir: ${REPO}.
This slice moved add-on control from per-USER (userWagonSettings) to per-SHOP, platform-only (shops/{id}.features), with a useShopFeatures() hook + AddonGate, a /addons platform UI, gated admin menu+routes, and removal of the AdminSettings wagon tab. Plan: docs/ADDONS_PLATFORM_CONTROL_PLAN.md.

AREA: ${a.area}
${a.prompt}

Read the relevant files (and git diff vs ${BASE} where useful). Run \`cd ${REPO} && npm run build 2>&1 | tail -3\` to confirm the app builds. Be skeptical — the DEFAULT-ON invariant (existing b8shield shop keeps all add-ons) and the no-money-path guarantee are the highest stakes. Report VERDICT 'CLEAN' or 'FIX_FIRST' with specific mustFix (quote exact lines).`,
    { label: `audit:${a.area}`, phase: 'Audit', agentType: 'general-purpose', schema: VERDICT_SCHEMA }
  )
))

phase('Critic')
const critic = await agent(`Cross-cutting consistency critic for the Wagons→Add-ons slice. Working dir: ${REPO}. Do NOT edit.
Area verdicts:
${JSON.stringify(verdicts.filter(Boolean), null, 2)}

Now find what the per-area skeptics missed — the END-TO-END chain and edge cases:
1. THE FULL CHAIN: trace one add-on (e.g. dining) from platform toggle (shops/{id}.features.dining=false) → loadShopFeatures → useShopFeatures().isEnabled('dining') → AppLayout menu hides it → AddonGate redirects /admin/dining. Is every link consistent (same key 'dining', same default-ON)? Could the platform write a key the admin never reads, or vice versa?
2. DEFAULT-ON end to end: a brand-new shop provisioned by ProvisionShopModal writes features={affiliate:true,campaigns:true,dining:false,ambassador:false}. With dining:false explicitly, the dining wagon will be HIDDEN for new shops — is that intended vs the b8shield default-on? (Note the existing shop has NO field → all on; new shops have explicit defaults. Flag the behavior difference, not necessarily a bug.)
3. The 3 direct cross-wagon imports (AuthContext/OrderContext→dining-wagon, AffiliatePortalCampaigns→campaign-wagon) bypass the gate — do they cause a disabled add-on to still run logic? Is that a leak worth noting?
4. Money path: confirm NOTHING in this slice touches checkout/price/affiliate-discount (affiliate gating was deferred). grep the diff for price/total/discount/stripe.
5. Run \`cd ${REPO} && npm run build 2>&1 | tail -3\`.
Report a concise findings list + final GO / NO-GO for shipping the slice. Distinguish real gaps from intended-behavior notes.`,
  { label: 'consistency-critic', phase: 'Critic', agentType: 'general-purpose' }
)

return { verdicts: verdicts.filter(Boolean), critic }
