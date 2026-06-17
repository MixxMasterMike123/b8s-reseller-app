/**
 * backfill-shopid.cjs — Phase 1 backfill of the multi-tenant migration.
 *
 * Stamps `shopId = DEFAULT_SHOP_ID` on every EXISTING document in the
 * shop-scoped collections that doesn't already have a shopId. New writes are
 * already tagged (Phase 1 Slices 1a–1c); this catches the data created before
 * those slices. After this runs, every in-scope doc carries a shopId, which is
 * the precondition for Phase 2 (scoping reads) and Phase 3 (rules).
 *
 * SAFETY:
 *   - DRY RUN by default: counts what WOULD be stamped per collection and
 *     exits. Pass `--commit` to actually write.
 *   - Idempotent: documents that already have a `shopId` are SKIPPED, so it's
 *     safe to re-run. Re-running after a partial run finishes the rest.
 *   - Per-field reversible: it only ADDS the `shopId` field (merge update);
 *     it never deletes or rewrites other fields. To revert, delete the field.
 *   - Batched at 400 writes/commit (under Firestore's 500 limit) with progress
 *     logging per collection.
 *   - Optional `--only=products,orders` to run a subset; `--shop=<id>` to
 *     override the target shop id (defaults to DEFAULT_SHOP_ID).
 *
 * USAGE (run by Mikael — live data write, STOP-and-surface class):
 *   node scripts/backfill-shopid.cjs                  # dry run, all collections
 *   node scripts/backfill-shopid.cjs --only=orders    # dry run, one collection
 *   node scripts/backfill-shopid.cjs --commit         # write all collections
 *   node scripts/backfill-shopid.cjs --only=orders --commit
 *   # users is OPT-IN ONLY (never in the default sweep). Legacy single-shop
 *   # users all belong to the original shop; platform super-admins are skipped:
 *   node scripts/backfill-shopid.cjs --only=users --shop=b8shield           # dry run
 *   node scripts/backfill-shopid.cjs --only=users --shop=b8shield --commit  # write
 *
 * PRECONDITION: run scripts/seed-default-shop.cjs first so shops/{id} exists
 * (not strictly required for the backfill itself, but it's the intended order).
 * Requires Application Default Credentials or a serviceAccountKey.json.
 */

// firebase-admin is installed in functions/node_modules (not the repo root),
// so resolve it from there regardless of where this script is run from.
const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

// Keep in sync with src/config/tenancy.js + functions/src/config/tenancy.ts.
const DEFAULT_SHOP_ID = 'b8shield';

// The shop-scoped collections, derived from the Phase 1 create sites. Wagon
// CRM collections (dining/ambassador-specific) are intentionally EXCLUDED —
// they're a later slice. NOTE: ambassador contacts live in `affiliates`, which
// IS included here.
const IN_SCOPE_COLLECTIONS = [
  'products',
  'productGroups',
  'b2cCustomers',
  'affiliates',
  'affiliateApplications',
  'affiliateClicks',
  'campaigns',
  'campaignRevenueTracking',
  'campaignParticipants',
  'pages',
  'marketingMaterials',
  'affiliatePayouts',
  'orders',
];

// OPT-IN-ONLY collections — reachable via --only=<name> but NEVER in the default
// all-collections sweep, because blanket-stamping them to ONE shop is a
// deliberate, shop-specific decision (you must pass --shop explicitly):
//   • users — legacy B2B/B2C users from the original single-shop app all belong
//     to that shop. Tenant-isolation prereq (firestore.rules users scoping).
//     ⚠️ PLATFORM users (platform==true) are NEVER stamped — they bypass
//     shop-scoping and must not be pinned to one shop (guarded in stampMissing).
const OPT_IN_COLLECTIONS = ['users'];
const ALLOWED_COLLECTIONS = [...IN_SCOPE_COLLECTIONS, ...OPT_IN_COLLECTIONS];

const BATCH_SIZE = 400; // under Firestore's 500-writes-per-batch limit

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const onlyArg = args.find((a) => a.startsWith('--only='));
const shopArg = args.find((a) => a.startsWith('--shop='));
const SHOP_ID = shopArg ? shopArg.split('=')[1] : DEFAULT_SHOP_ID;
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean) : null;

// Default sweep = IN_SCOPE only. --only can target ANY allowed collection
// (including the opt-in `users`). An --only name not in the allowed set is an error.
const collectionsToRun = ONLY
  ? ALLOWED_COLLECTIONS.filter((c) => ONLY.includes(c))
  : IN_SCOPE_COLLECTIONS;

if (ONLY) {
  const unknown = ONLY.filter((c) => !ALLOWED_COLLECTIONS.includes(c));
  if (unknown.length) {
    console.error(`❌ Unknown --only collection(s): ${unknown.join(', ')}. Allowed: ${ALLOWED_COLLECTIONS.join(', ')}`);
    process.exit(1);
  }
}

admin.initializeApp(); // default credentials, like the other admin scripts here
const db = getFirestore('b8s-reseller-db'); // the CORRECT named database
db.settings({ ignoreUndefinedProperties: true });

async function backfillCollection(name) {
  const snap = await db.collection(name).get();
  const total = snap.size;
  // Only docs missing a shopId (idempotent: already-tagged docs are skipped).
  // For `users`, ALSO skip platform super-admins — they bypass shop-scoping and
  // must never be pinned to a single shop (even if their shopId were missing).
  let platformSkipped = 0;
  const toStamp = snap.docs.filter((d) => {
    const data = d.data() || {};
    const sid = data.shopId;
    const missing = sid === undefined || sid === null || sid === '';
    if (!missing) return false;
    if (name === 'users' && data.platform === true) { platformSkipped++; return false; }
    return true;
  });
  if (name === 'users' && platformSkipped > 0) {
    console.log(`    (skipped ${platformSkipped} platform super-admin user(s) — never shop-pinned)`);
  }

  console.log(
    `  ${name}: ${total} docs, ${toStamp.length} need shopId` +
      (toStamp.length === 0 ? ' ✅' : '')
  );

  if (!COMMIT || toStamp.length === 0) {
    return { collection: name, total, stamped: COMMIT ? toStamp.length : 0, wouldStamp: toStamp.length };
  }

  let written = 0;
  for (let i = 0; i < toStamp.length; i += BATCH_SIZE) {
    const slice = toStamp.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const d of slice) {
      // merge update — adds shopId only, leaves every other field untouched.
      batch.set(d.ref, { shopId: SHOP_ID }, { merge: true });
    }
    await batch.commit();
    written += slice.length;
    console.log(`    …committed ${written}/${toStamp.length}`);
  }
  return { collection: name, total, stamped: written, wouldStamp: toStamp.length };
}

async function main() {
  console.log('🔧 Backfill shopId — multi-tenant Phase 1');
  console.log(`   target shopId: ${SHOP_ID}`);
  console.log(`   collections:   ${collectionsToRun.join(', ')}`);
  console.log(`   mode:          ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  if (collectionsToRun.length === 0) {
    console.log('⚠️  No matching collections (check --only=). In-scope set:');
    console.log(`   ${IN_SCOPE_COLLECTIONS.join(', ')}`);
    return;
  }

  const results = [];
  for (const name of collectionsToRun) {
    results.push(await backfillCollection(name));
  }

  const totalToStamp = results.reduce((s, r) => s + r.wouldStamp, 0);
  console.log('');
  if (!COMMIT) {
    console.log(`🟡 Dry run complete. ${totalToStamp} docs would be stamped. Re-run with --commit to write.`);
  } else {
    const totalStamped = results.reduce((s, r) => s + r.stamped, 0);
    console.log(`🔴 Backfill complete. Stamped ${totalStamped} docs with shopId='${SHOP_ID}'.`);
    console.log('   Re-run (dry) to confirm 0 remaining, then proceed to Phase 2.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  });
