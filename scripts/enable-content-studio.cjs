/**
 * enable-content-studio.cjs — flip the OPT-IN Innehållsstudio flag on a shop.
 *
 * Content Studio is explicit-opt-in (features.contentStudio === true), unlike
 * the default-ON legacy add-ons — so enabling it is a deliberate per-shop act,
 * the platform-console lever in script form.
 *
 * USAGE:
 *   node scripts/enable-content-studio.cjs <shopId>            # dry run
 *   node scripts/enable-content-studio.cjs <shopId> --commit   # write
 *   node scripts/enable-content-studio.cjs <shopId> --commit --off  # disable
 *
 * Requires Application Default Credentials, same as the other scripts here.
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore, FieldValue } = functionsRequire('firebase-admin/firestore');

const args = process.argv.slice(2);
const shopId = args.find((a) => !a.startsWith('--'));
const COMMIT = args.includes('--commit');
const OFF = args.includes('--off');

if (!shopId) {
  console.error('Usage: node scripts/enable-content-studio.cjs <shopId> [--commit] [--off]');
  process.exit(1);
}

admin.initializeApp();
const db = getFirestore('b8s-reseller-db'); // the CORRECT named database

async function main() {
  const value = !OFF;
  console.log(`🎬 Content Studio flag — shops/${shopId}.features.contentStudio → ${value}`);
  console.log(`   mode: ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);

  const ref = db.collection('shops').doc(shopId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`❌ shops/${shopId} does not exist — aborting.`);
    process.exit(1);
  }
  const features = snap.data().features || {};
  console.log(`   current features.contentStudio: ${JSON.stringify(features.contentStudio)}`);

  if (!COMMIT) {
    console.log('   (dry run — nothing written)');
    return;
  }

  await ref.update({
    'features.contentStudio': value,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const after = (await ref.get()).data().features;
  console.log(`✅ written. features.contentStudio is now: ${JSON.stringify(after.contentStudio)}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('❌ failed:', e.message);
  process.exit(1);
});
