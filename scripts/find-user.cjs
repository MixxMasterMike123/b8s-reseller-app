// find-user.cjs — read-only lookup of a user by email across Auth + Firestore.
// USAGE: node scripts/find-user.cjs <email>
const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');
const { getAuth } = functionsRequire('firebase-admin/auth');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Usage: node scripts/find-user.cjs <email>'); process.exit(1); }

admin.initializeApp();
const db = getFirestore('b8s-reseller-db');

(async () => {
  console.log(`🔎 Looking up: ${email}\n`);
  // 1. Firebase Auth
  let authUser = null;
  try {
    authUser = await getAuth().getUserByEmail(email);
    console.log('AUTH ✅ exists');
    console.log(`   uid:           ${authUser.uid}`);
    console.log(`   emailVerified: ${authUser.emailVerified}`);
    console.log(`   disabled:      ${authUser.disabled}`);
    console.log(`   providers:     ${authUser.providerData.map(p=>p.providerId).join(', ') || '(none)'}`);
    console.log(`   customClaims:  ${JSON.stringify(authUser.customClaims || {})}`);
  } catch (e) {
    console.log(`AUTH ❌ not found in Firebase Auth (${e.code || e.message})`);
  }
  console.log('');
  // 2. Firestore users/{uid}
  if (authUser) {
    const snap = await db.collection('users').doc(authUser.uid).get();
    if (snap.exists) {
      const d = snap.data();
      console.log('FIRESTORE users/{uid} ✅ exists');
      console.log(`   role:     ${d.role}`);
      console.log(`   platform: ${d.platform === true ? 'true' : (d.platform ?? '(unset)')}`);
      console.log(`   shopId:   ${d.shopId || '(unset)'}`);
      console.log(`   isActive: ${d.isActive ?? d.active ?? '(unset)'}`);
      console.log(`   company:  ${d.companyName || '(unset)'}`);
    } else {
      console.log(`FIRESTORE ❌ users/${authUser.uid} doc MISSING (Auth exists but no Firestore profile)`);
    }
  }
  // 3. Also check if any users doc has this email (in case doc id != uid)
  const byEmail = await db.collection('users').where('email','==',email).get();
  console.log(`\nFIRESTORE users where email==${email}: ${byEmail.size} doc(s)`);
  byEmail.forEach(d => console.log(`   docId=${d.id} role=${d.data().role} platform=${d.data().platform===true} shopId=${d.data().shopId||'-'}`));
})().then(()=>process.exit(0)).catch(e=>{console.error('❌',e);process.exit(1);});
