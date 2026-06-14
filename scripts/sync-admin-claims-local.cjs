/**
 * sync-admin-claims-local.cjs — Phase 3 step 2 (local equivalent of the
 * syncAdminClaims HTTP function, without needing the maintenance secret).
 *
 * Stamps the custom auth claim {role, shopId, platform} onto each admin user
 * from their users/{uid} doc, so Storage rules (which can't read Firestore) and
 * Firestore rules can read the tenant identity from the token.
 *
 * DRY-RUN by default. Idempotent. Same trusted-local-credentials path as the
 * other scripts here (seed/backfill/set-platform-admin).
 *
 * USAGE (Mikael runs):
 *   node scripts/sync-admin-claims-local.cjs            # dry run
 *   node scripts/sync-admin-claims-local.cjs --commit   # set the claims
 *
 * After --commit: LOG OUT and back in to the admin (or wait up to 1h) so the
 * browser fetches a fresh token carrying the new claim.
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const COMMIT = process.argv.includes('--commit');

admin.initializeApp();
const db = getFirestore('b8s-reseller-db');

async function main() {
  console.log('🔑 Sync admin custom claims {role, shopId, platform}');
  console.log(`   mode: ${COMMIT ? '🔴 COMMIT (will set claims)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  const admins = await db.collection('users').where('role', '==', 'admin').get();
  console.log(`Found ${admins.size} admin user(s):`);

  for (const d of admins.docs) {
    const x = d.data();
    const desired = {
      role: 'admin',
      shopId: x.shopId || null,
      platform: x.platform === true,
    };
    let current = {};
    try {
      const rec = await admin.auth().getUser(d.id);
      current = rec.customClaims || {};
    } catch (e) {
      console.log(`  - ${d.id} (${x.email}) ❌ no auth user: ${e.message}`);
      continue;
    }
    const upToDate =
      current.role === desired.role &&
      current.shopId === desired.shopId &&
      current.platform === desired.platform;

    console.log(
      `  - ${d.id} (${x.email})\n      current: ${JSON.stringify(current)}\n      desired: ${JSON.stringify(desired)}  ${upToDate ? '(already up to date)' : (COMMIT ? '→ SETTING' : '→ WOULD SET')}`
    );

    if (COMMIT && !upToDate) {
      await admin.auth().setCustomUserClaims(d.id, { ...current, ...desired });
      console.log('      ✅ claim set');
    }
  }

  console.log('');
  if (!COMMIT) {
    console.log('🟡 Dry run complete. Re-run with --commit to set claims.');
  } else {
    console.log('🔴 Done. NOW LOG OUT + BACK IN to the admin so the token refreshes.');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('❌ failed:', e); process.exit(1); });
