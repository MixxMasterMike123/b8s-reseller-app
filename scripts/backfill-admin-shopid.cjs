/**
 * backfill-admin-shopid.cjs — stamp shopId on the uid-keyed admin registries
 * (adminUIDs + adminPresence) for the tenant-isolation hardening (Finding 2).
 *
 * These two collections are keyed by the admin's UID, so — unlike the blanket
 * backfill-shopid.cjs (which stamps DEFAULT_SHOP_ID) — the correct shopId is
 * INFERRED PER-DOC from the matching users/{uid} doc:
 *   • platform super-admin (users/{uid}.platform === true) → shopId = null
 *     (they bypass shop-scoping; must NOT be pinned to a shop).
 *   • shop admin → shopId = users/{uid}.shopId.
 *   • no matching users doc (orphan) → left UNTOUCHED + reported (manual review).
 *
 * Why this matters: after the firestore.rules tightening, a shop admin's read
 * of adminPresence / adminUIDs is scoped to docs whose shopId == their own, and
 * the adminUIDs delete path checks the EXISTING doc's shopId. Legacy docs
 * created before stamping have no shopId, so this backfill is the precondition
 * for deploying the tightened rules without a transient gap.
 *
 * SAFETY:
 *   - DRY RUN by default; pass --commit to write.
 *   - Idempotent: a doc whose shopId already matches the inferred value is
 *     SKIPPED. Re-running is safe.
 *   - Per-field: only sets `shopId` (merge); never touches other fields.
 *   - --only=adminUIDs|adminPresence to run one; default runs both.
 *
 * USAGE (run by Mikael — live data write, STOP-and-surface class):
 *   node scripts/backfill-admin-shopid.cjs                 # dry run, both
 *   node scripts/backfill-admin-shopid.cjs --only=adminUIDs
 *   node scripts/backfill-admin-shopid.cjs --commit        # write both
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const COLLECTIONS = ['adminUIDs', 'adminPresence'];

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean) : null;
const toRun = ONLY ? COLLECTIONS.filter((c) => ONLY.includes(c)) : COLLECTIONS;

if (ONLY) {
  const unknown = ONLY.filter((c) => !COLLECTIONS.includes(c));
  if (unknown.length) {
    console.error(`❌ Unknown --only: ${unknown.join(', ')}. Allowed: ${COLLECTIONS.join(', ')}`);
    process.exit(1);
  }
}

admin.initializeApp();
const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

// Resolve the intended shopId for a uid from its users doc.
//   returns { resolved: true, shopId } | { resolved: false } (orphan, no users doc)
async function inferShopId(uid) {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return { resolved: false };
  const data = userSnap.data() || {};
  // Platform super-admins bypass scoping → null (never shop-pinned).
  if (data.platform === true) return { resolved: true, shopId: null };
  return { resolved: true, shopId: data.shopId || null };
}

async function backfill(name) {
  const snap = await db.collection(name).get();
  let stamped = 0;
  let skipped = 0;
  const orphans = [];
  const batchOps = [];

  for (const d of snap.docs) {
    const uid = d.id; // both collections are keyed by the admin's uid
    const existing = d.data() || {};
    const inf = await inferShopId(uid);
    if (!inf.resolved) { orphans.push(uid); continue; }
    // Idempotent: already correct (incl. both null) → skip.
    const current = existing.shopId === undefined ? undefined : existing.shopId;
    if (current === inf.shopId) { skipped++; continue; }
    batchOps.push({ ref: d.ref, shopId: inf.shopId });
  }

  console.log(
    `  ${name}: ${snap.size} docs — ${batchOps.length} to stamp, ${skipped} already correct` +
      (orphans.length ? `, ${orphans.length} ORPHAN (no users doc, LEFT UNTOUCHED)` : '')
  );
  if (orphans.length) console.log(`    orphans: ${orphans.join(', ')}`);

  if (COMMIT && batchOps.length) {
    for (let i = 0; i < batchOps.length; i += 400) {
      const slice = batchOps.slice(i, i + 400);
      const batch = db.batch();
      for (const op of slice) batch.set(op.ref, { shopId: op.shopId }, { merge: true });
      await batch.commit();
      stamped += slice.length;
      console.log(`    …committed ${stamped}/${batchOps.length}`);
    }
  }
  return { name, total: snap.size, wouldStamp: batchOps.length, stamped, orphans: orphans.length };
}

async function main() {
  console.log('🔧 Backfill admin shopId (adminUIDs + adminPresence) — per-doc inference');
  console.log(`   collections: ${toRun.join(', ')}`);
  console.log(`   mode:        ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  const results = [];
  for (const name of toRun) results.push(await backfill(name));

  const totalToStamp = results.reduce((s, r) => s + r.wouldStamp, 0);
  const totalOrphans = results.reduce((s, r) => s + r.orphans, 0);
  console.log('');
  if (!COMMIT) {
    console.log(`🟡 Dry run complete. ${totalToStamp} docs would be stamped, ${totalOrphans} orphan(s). Re-run with --commit to write.`);
  } else {
    const totalStamped = results.reduce((s, r) => s + r.stamped, 0);
    console.log(`🔴 Backfill complete. Stamped ${totalStamped} docs. ${totalOrphans} orphan(s) left for manual review.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('❌ Backfill failed:', err); process.exit(1); });
