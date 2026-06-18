/**
 * purge-legacy-users.cjs — remove stale legacy demo users from `users`.
 *
 * CONTEXT (tenant-isolation hardening, 2026-06-18): the original single-shop
 * app left ~372 legacy `user`/`reseller` docs in `users`. They were kept only
 * as demo "real data" and are NOT needed. With no shop live, the cleanest way
 * to unblock the hardened `users` firestore.rules (which deny cross-shop /
 * unscoped user docs) is to DELETE these stale docs rather than backfill a
 * shopId onto them. After this, `users` holds only the 2 platform super-admins,
 * which the rules trivially allow.
 *
 * SAFETY (deletion is irreversible — read this):
 *   - DRY RUN by default: lists exactly what WOULD be deleted (count + a sample)
 *     and exits. Pass `--commit` to actually delete.
 *   - KEEPS, unconditionally, every doc where `platform === true` (the super-
 *     admins). Also keeps any doc you name via `--keep=<uid>,<uid>`.
 *   - REFUSES to run if it would delete a non-platform `role:'admin'` doc unless
 *     you pass `--allow-admin-delete` — a guard against nuking a real shop admin
 *     you forgot about. (Audit on 2026-06-18 found ZERO such docs.)
 *   - Batched at 400 deletes/commit (under Firestore's 500/batch limit).
 *   - Targets the CORRECT named database `b8s-reseller-db` (same as the app +
 *     the backfill script). Requires Application Default Credentials.
 *
 * USAGE (run by Mikael — live data DELETE, STOP-and-surface class):
 *   node scripts/purge-legacy-users.cjs                 # dry run (default)
 *   node scripts/purge-legacy-users.cjs --commit        # actually delete
 *   node scripts/purge-legacy-users.cjs --keep=abc,def  # keep extra uids
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const BATCH_SIZE = 400;

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const ALLOW_ADMIN_DELETE = args.includes('--allow-admin-delete');
const keepArg = args.find((a) => a.startsWith('--keep='));
const EXTRA_KEEP = keepArg
  ? keepArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
  : [];

admin.initializeApp(); // default credentials, like the other admin scripts here
const db = getFirestore('b8s-reseller-db');

async function main() {
  console.log('🧹 Purge legacy users — tenant-isolation cleanup');
  console.log(`   database:  b8s-reseller-db`);
  console.log(`   mode:      ${COMMIT ? '🔴 COMMIT (will DELETE)' : '🟡 DRY RUN (no delete)'}`);
  if (EXTRA_KEEP.length) console.log(`   extra keep: ${EXTRA_KEEP.join(', ')}`);
  console.log('');

  const snap = await db.collection('users').get();

  const keep = [];     // platform super-admins + explicit --keep
  const toDelete = [];  // everything else
  const adminCasualties = []; // non-platform role:'admin' that WOULD be deleted

  snap.forEach((d) => {
    const x = d.data() || {};
    const isKeeper = x.platform === true || EXTRA_KEEP.includes(d.id);
    if (isKeeper) {
      keep.push({ id: d.id, email: x.email, role: x.role, platform: x.platform || false, shopId: x.shopId || null });
    } else {
      toDelete.push(d.ref);
      if (x.role === 'admin') adminCasualties.push({ id: d.id, email: x.email, shopId: x.shopId || null });
    }
  });

  console.log(`KEEP (${keep.length}):`);
  console.log(JSON.stringify(keep, null, 2));
  console.log(`\nWOULD DELETE: ${toDelete.length} of ${snap.size} docs`);

  if (adminCasualties.length && !ALLOW_ADMIN_DELETE) {
    console.error(`\n⛔ ABORT: ${adminCasualties.length} non-platform role:'admin' doc(s) are in the delete set:`);
    console.error(JSON.stringify(adminCasualties, null, 2));
    console.error("These look like real shop admins. If you truly want them gone, re-run with --allow-admin-delete, or keep them with --keep=<uid>.");
    process.exit(2);
  }

  if (!COMMIT) {
    console.log(`\n🟡 Dry run complete. ${toDelete.length} docs would be DELETED, ${keep.length} kept. Re-run with --commit to delete.`);
    return;
  }

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const slice = toDelete.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of slice) batch.delete(ref);
    await batch.commit();
    deleted += slice.length;
    console.log(`    …deleted ${deleted}/${toDelete.length}`);
  }
  console.log(`\n🔴 Purge complete. Deleted ${deleted} legacy user docs. Kept ${keep.length} (platform super-admins).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('❌ Purge failed:', err); process.exit(1); });
