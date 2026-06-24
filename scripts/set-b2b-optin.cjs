// set-b2b-optin.cjs — set shops/{id}.features.b2b = false on existing shops so
// the B2B Wholesale add-on is OPT-IN (hidden until turned on per shop from the
// platform). Dry-run by default; pass --commit to write. Read-only otherwise.
// USAGE:
//   node scripts/set-b2b-optin.cjs            # dry run (shows current + planned)
//   node scripts/set-b2b-optin.cjs --commit   # write features.b2b=false
const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const COMMIT = process.argv.includes('--commit');

admin.initializeApp();
const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

(async () => {
  console.log(`B2B opt-in flag — ${COMMIT ? 'COMMIT' : 'DRY RUN'}\n`);
  const snap = await db.collection('shops').get();
  const plan = [];
  snap.forEach((d) => {
    const f = d.data().features || {};
    const current = f.b2b;
    // Only touch shops where b2b is not already explicitly false.
    if (current !== false) plan.push({ id: d.id, current });
    console.log(`  ${d.id}: features.b2b currently = ${current === undefined ? '(unset → default-ON)' : current}`);
  });

  console.log(`\n${plan.length} shop(s) would be set to features.b2b=false: ${plan.map((p) => p.id).join(', ') || '(none)'}`);

  if (!COMMIT) {
    console.log('\nDRY RUN — nothing written. Re-run with --commit to apply.');
    return;
  }
  for (const p of plan) {
    await db.collection('shops').doc(p.id).set({ features: { b2b: false } }, { merge: true });
    console.log(`  ✅ ${p.id}: features.b2b = false`);
  }
  console.log('\n✅ committed.');
})().then(() => process.exit(0)).catch((e) => { console.error('❌', e); process.exit(1); });
