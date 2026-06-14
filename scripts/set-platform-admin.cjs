/**
 * set-platform-admin.cjs — Phase 3 step (a).
 *
 * Marks the platform super-admin on their users/{uid} doc:
 *   - platform: true   → bypasses shop-scoping in the new rules
 *   - shopId: <id>     → home shop (belt-and-suspenders if platform is removed)
 * Keeps role:'admin' untouched (so all existing role=='admin' rules keep working).
 *
 * Idempotent + DRY-RUN by default. Reversible (delete the two fields to revert).
 *
 * USAGE (Mikael runs — live data write, STOP-and-surface class):
 *   node scripts/set-platform-admin.cjs                       # dry run, all admins
 *   node scripts/set-platform-admin.cjs --commit              # write
 *   node scripts/set-platform-admin.cjs --uid=<uid> --commit  # target one uid
 *
 * Default: every users doc with role=='admin' gets platform:true + shopId.
 * (Today there is exactly one admin = Mikael.)
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

// Keep in sync with src/config/tenancy.js + functions/src/config/tenancy.ts.
const DEFAULT_SHOP_ID = 'b8shield';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const uidArg = args.find((a) => a.startsWith('--uid='));
const TARGET_UID = uidArg ? uidArg.split('=')[1] : null;
const shopArg = args.find((a) => a.startsWith('--shop='));
const SHOP_ID = shopArg ? shopArg.split('=')[1] : DEFAULT_SHOP_ID;

admin.initializeApp();
const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

async function main() {
  console.log('👑 Set platform super-admin — multi-tenant Phase 3');
  console.log(`   shopId: ${SHOP_ID}`);
  console.log(`   mode:   ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  let docs;
  if (TARGET_UID) {
    const snap = await db.collection('users').doc(TARGET_UID).get();
    if (!snap.exists) { console.log(`❌ users/${TARGET_UID} not found`); return; }
    docs = [snap];
  } else {
    const snap = await db.collection('users').where('role', '==', 'admin').get();
    docs = snap.docs;
  }

  console.log(`Found ${docs.length} admin user(s):`);
  for (const d of docs) {
    const x = d.data();
    const needsPlatform = x.platform !== true;
    const needsShop = !x.shopId;
    console.log(
      `  - ${d.id} (${x.email}) | platform:${x.platform === true ? 'already' : 'WILL SET'} | shopId:${x.shopId || (needsShop ? `WILL SET ${SHOP_ID}` : x.shopId)}`
    );
    if (COMMIT && (needsPlatform || needsShop)) {
      await d.ref.set(
        { platform: true, shopId: x.shopId || SHOP_ID },
        { merge: true }
      );
      console.log(`    ✅ updated`);
    }
  }

  console.log('');
  if (!COMMIT) {
    console.log('🟡 Dry run complete. Re-run with --commit to write.');
  } else {
    console.log('🔴 Done. NEXT: deploy + run syncAdminClaims so the custom claim');
    console.log('   carries {role, shopId, platform}, then re-login to refresh the token.');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('❌ failed:', e); process.exit(1); });
