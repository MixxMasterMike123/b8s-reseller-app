/**
 * seed-default-shop.cjs — Phase 0 of the multi-tenant migration.
 *
 * Creates the FIRST tenant doc `shops/{DEFAULT_SHOP_ID}` by copying the current
 * storefront identity out of the legacy `settings/app.storeIdentity` doc. After
 * this runs, the shopConfig seam (src/config/shopConfig.js) reads/writes the
 * tenant doc instead of settings/app — transparently, with no flag day, because
 * the seam falls back to settings/app until this doc exists.
 *
 * SAFETY:
 *   - DRY RUN by default. It prints exactly what it WOULD write and exits.
 *     Pass `--commit` to actually write.
 *   - Idempotent: if shops/{id} already exists it does NOT overwrite (pass
 *     `--force` to overwrite, which you normally should not).
 *   - Read-only on settings/app (never modifies the legacy doc) — so it is
 *     fully reversible: deleting shops/{id} reverts to pre-seed behavior.
 *
 * USAGE (run by Mikael — this is a live data write, STOP-and-surface class):
 *   node scripts/seed-default-shop.cjs            # dry run, shows the plan
 *   node scripts/seed-default-shop.cjs --commit   # actually create the doc
 *
 * Requires Application Default Credentials (gcloud auth application-default
 * login) OR a serviceAccountKey.json — same as the other admin scripts here.
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Keep in sync with src/config/tenancy.js DEFAULT_SHOP_ID.
const DEFAULT_SHOP_ID = 'b8shield';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const FORCE = args.includes('--force');

admin.initializeApp(); // default credentials, like scripts/zero-out-affiliates.cjs
const db = getFirestore('b8s-reseller-db'); // the CORRECT named database
db.settings({ ignoreUndefinedProperties: true });

async function main() {
  console.log('🌱 Seed default shop — multi-tenant Phase 0');
  console.log(`   target: shops/${DEFAULT_SHOP_ID}`);
  console.log(`   mode:   ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  // 1. Read the legacy storefront config.
  const legacySnap = await db.collection('settings').doc('app').get();
  const storeIdentity =
    (legacySnap.exists && legacySnap.data() && legacySnap.data().storeIdentity) || {};
  console.log('📖 settings/app.storeIdentity:');
  console.log(JSON.stringify(storeIdentity, null, 2));
  console.log('');

  // 2. Check whether the tenant doc already exists.
  const shopRef = db.collection('shops').doc(DEFAULT_SHOP_ID);
  const shopSnap = await shopRef.get();
  if (shopSnap.exists && !FORCE) {
    console.log(`✅ shops/${DEFAULT_SHOP_ID} already exists — nothing to do.`);
    console.log('   (Pass --force to overwrite, which you normally should NOT.)');
    return;
  }

  // 3. Build the new tenant doc. storeIdentity carries the storefront config;
  //    status is the kill switch (default active); name/createdAt are metadata.
  const shopDoc = {
    storeIdentity,
    status: 'active', // kill switch — Super Admin can flip to 'disabled' later
    name: storeIdentity.shopName || DEFAULT_SHOP_ID,
    ownerUid: null, // platform-owned for now; provisioning sets this for new shops
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    seededFrom: 'settings/app',
  };

  console.log(`📝 ${COMMIT ? 'Writing' : 'WOULD write'} shops/${DEFAULT_SHOP_ID}:`);
  console.log(
    JSON.stringify({ ...shopDoc, createdAt: '<serverTimestamp>' }, null, 2)
  );
  console.log('');

  if (!COMMIT) {
    console.log('🟡 Dry run complete. Re-run with --commit to write.');
    return;
  }

  await shopRef.set(shopDoc, { merge: true });
  console.log(`🔴 Wrote shops/${DEFAULT_SHOP_ID}.`);
  console.log('   Verify in the console, then reload the storefront — the');
  console.log('   shopConfig seam now reads the tenant doc.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
