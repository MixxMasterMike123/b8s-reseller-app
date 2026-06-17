/**
 * Firestore security-rules test — Tenant ISOLATION HARDENING (Phase A).
 *
 * Targets the cross-shop LEAKS found in the 2026-06-17 audit (see
 * docs/TENANT_ISOLATION_HARDENING_PLAN.md). Each DENY here is a leak in the
 * CURRENT rules and must pass after the rewrite; each ALLOW guards against a
 * lockout regression. Complements rules-tests/firestore-rules.test.cjs (which
 * covers the already-correct collections).
 *
 * Seeds AUTH CUSTOM CLAIMS ({role, shopId, platform}) to mirror production
 * (syncAdminClaims / createShopUser write these to the token). The hardened
 * rules prefer the claim (cheap, no get()) with a userDoc() fallback, so this
 * suite also implicitly verifies the claim path.
 *
 * RUN (never touches prod):
 *   1) JAVA_HOME=<jdk21> firebase emulators:start --only firestore --project demo-rules-test
 *   2) node rules-tests/firestore-isolation.test.cjs
 */

const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { setDoc, getDoc, doc, getDocs, query, where, collection, deleteDoc, updateDoc } =
  require('firebase/firestore');

const PROJECT_ID = 'demo-rules-test';
const RULES = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

let env;
let passed = 0;
let failed = 0;

async function check(name, promise) {
  try {
    await promise;
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name} — ${e.message}`);
    failed++;
  }
}

// Auth contexts WITH custom claims (production shape).
const platformDb = () =>
  env.authenticatedContext('mikael', { role: 'admin', platform: true, shopId: 'shopA' }).firestore();
const shopAAdminDb = () =>
  env.authenticatedContext('adminA', { role: 'admin', platform: false, shopId: 'shopA' }).firestore();
const shopBAdminDb = () =>
  env.authenticatedContext('adminB', { role: 'admin', platform: false, shopId: 'shopB' }).firestore();
const customerDb = (uid) =>
  env.authenticatedContext(uid, { email: uid + '@x.com' }).firestore();

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // users — mirror the claims on the docs too (rules may fall back to userDoc)
    await setDoc(doc(db, 'users/mikael'), { role: 'admin', platform: true, shopId: 'shopA', active: true, email: 'mikael@x.com' });
    await setDoc(doc(db, 'users/adminA'), { role: 'admin', platform: false, shopId: 'shopA', active: true, email: 'adminA@x.com' });
    await setDoc(doc(db, 'users/adminB'), { role: 'admin', platform: false, shopId: 'shopB', active: true, email: 'adminB@x.com' });
    // a plain B2B/customer user in shop B (the kind a shopA admin must not read)
    await setDoc(doc(db, 'users/custB'), { role: 'user', shopId: 'shopB', active: true, email: 'custB@x.com' });

    await setDoc(doc(db, 'shops/shopA'), { name: 'Shop A', status: 'active' });
    await setDoc(doc(db, 'shops/shopB'), { name: 'Shop B', status: 'active' });

    // shop-scoped collections that currently leak on READ
    await setDoc(doc(db, 'orderStatuses/osA'), { shopId: 'shopA', label: 'Packad' });
    await setDoc(doc(db, 'orderStatuses/osB'), { shopId: 'shopB', label: 'Skickad' });
    await setDoc(doc(db, 'marketingMaterials/mmA'), { shopId: 'shopA', title: 'A flyer' });
    await setDoc(doc(db, 'marketingMaterials/mmB'), { shopId: 'shopB', title: 'B flyer' });

    // global config (a shop admin must NOT write these)
    await setDoc(doc(db, 'translations_sv_SE/k1'), { value: 'Hej' });
    await setDoc(doc(db, 'settings/app'), { COMPANY_NAME: 'X' });

    // wagon CRM (dining/ambassador add-ons) — platform-only after hardening
    await setDoc(doc(db, 'activities/a1'), { note: 'call' });
    await setDoc(doc(db, 'followUps/f1'), { note: 'fu' });
    await setDoc(doc(db, 'ambassadorActivities/aa1'), { note: 'amb' });
    await setDoc(doc(db, 'customerDocuments/cd1'), { note: 'doc' });
    await setDoc(doc(db, 'appSettings/s1'), { k: 'v' });
    await setDoc(doc(db, 'adminPresence/p1'), { uid: 'adminB' });
  });
}

async function run() {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });
  await env.clearFirestore();
  await seed();

  console.log('\n=== LEGIT ACCESS still works (no lockout) ===');
  await check('shopA admin reads OWN orderStatus', assertSucceeds(getDoc(doc(shopAAdminDb(), 'orderStatuses/osA'))));
  await check('shopA admin reads OWN marketingMaterial', assertSucceeds(getDoc(doc(shopAAdminDb(), 'marketingMaterials/mmA'))));
  await check('shopA admin reads OWN user doc', assertSucceeds(getDoc(doc(shopAAdminDb(), 'users/adminA'))));
  await check('shopA admin creates a user in OWN shop (non-platform)', assertSucceeds(
    setDoc(doc(shopAAdminDb(), 'users/newA'), { role: 'admin', platform: false, shopId: 'shopA', active: true })));
  await check('platform reads any user (shopB)', assertSucceeds(getDoc(doc(platformDb(), 'users/adminB'))));
  await check('platform writes global translation', assertSucceeds(setDoc(doc(platformDb(), 'translations_sv_SE/k2'), { value: 'Hej2' })));
  await check('platform reads wagon CRM (activities)', assertSucceeds(getDoc(doc(platformDb(), 'activities/a1'))));
  await check('anon reads global translation (storefront)', assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'translations_sv_SE/k1'))));

  console.log('\n=== ISOLATION: cross-shop / privilege escalation must be DENIED ===');
  // users — the biggest leak
  await check('shopA admin CANNOT read shopB admin user doc', assertFails(getDoc(doc(shopAAdminDb(), 'users/adminB'))));
  await check('shopA admin CANNOT read shopB customer user doc', assertFails(getDoc(doc(shopAAdminDb(), 'users/custB'))));
  await check('shopA admin CANNOT create a user for shopB', assertFails(
    setDoc(doc(shopAAdminDb(), 'users/evilB'), { role: 'admin', platform: false, shopId: 'shopB', active: true })));
  await check('shopA admin CANNOT create a PLATFORM user (escalation)', assertFails(
    setDoc(doc(shopAAdminDb(), 'users/evilP'), { role: 'admin', platform: true, shopId: 'shopA', active: true })));
  await check('shopA admin CANNOT create an UNSCOPED admin (no shopId)', assertFails(
    setDoc(doc(shopAAdminDb(), 'users/evilU'), { role: 'admin', active: true })));
  // global config
  await check('shopA admin CANNOT write global translation', assertFails(setDoc(doc(shopAAdminDb(), 'translations_sv_SE/k1'), { value: 'hacked' })));
  await check('shopA admin CANNOT write settings/app (global)', assertFails(updateDoc(doc(shopAAdminDb(), 'settings/app'), { COMPANY_NAME: 'hacked' })));
  // cross-shop reads on shop-scoped collections
  await check('shopA admin CANNOT read shopB orderStatus', assertFails(getDoc(doc(shopAAdminDb(), 'orderStatuses/osB'))));
  await check('shopA admin CANNOT read shopB marketingMaterial', assertFails(getDoc(doc(shopAAdminDb(), 'marketingMaterials/mmB'))));
  // wagon CRM — platform-only after hardening (a shop admin must be denied)
  await check('shopA admin CANNOT read wagon CRM (activities)', assertFails(getDoc(doc(shopAAdminDb(), 'activities/a1'))));
  await check('shopA admin CANNOT write wagon CRM (followUps)', assertFails(setDoc(doc(shopAAdminDb(), 'followUps/f2'), { note: 'x' })));
  await check('shopA admin CANNOT read ambassadorActivities', assertFails(getDoc(doc(shopAAdminDb(), 'ambassadorActivities/aa1'))));
  await check('shopA admin CANNOT read customerDocuments', assertFails(getDoc(doc(shopAAdminDb(), 'customerDocuments/cd1'))));
  await check('shopA admin CANNOT write appSettings', assertFails(setDoc(doc(shopAAdminDb(), 'appSettings/s2'), { k: 'x' })));
  await check('shopA admin CANNOT read adminPresence of shopB admin', assertFails(getDoc(doc(shopAAdminDb(), 'adminPresence/p1'))));

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  await env.cleanup();
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => { console.error('Harness error:', e); process.exit(2); });
