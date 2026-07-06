/**
 * rename-shopid.cjs — rename a tenant's shopId (e.g. melodieomc → melodie-mc).
 *
 * The shopId is the tenant key: it is the shops/{id} DOC ID, a `shopId` FIELD
 * on every shop-scoped document, a path segment in partitioned Storage objects
 * (`<type>/{shopId}/...`), the storefront URL prefix (/{shopId}/...), and part
 * of the admin custom auth claims ({role, shopId, platform}). A rename must
 * therefore touch all four layers. Code contains NO hardcoded shop ids
 * (verified 2026-07-06), so this is a pure data migration.
 *
 * ⚠️ RUN BEFORE Stripe Connect onboarding for the shop — accounts.create
 * stamps metadata.shopId into the connected account, which we cannot rewrite.
 *
 * WHAT IT DOES (in --commit order):
 *   1. Preflight: shops/{OLD} exists, shops/{NEW} does not, NEW is a valid
 *      unreserved slug (lowercase a-z 0-9 hyphen).
 *   2. Copies shops/{OLD} → shops/{NEW} including ALL subcollections
 *      (recursive).
 *   3. Updates the `shopId` field in place on every doc in the shop-scoped
 *      collections (batched, 400/commit).
 *   4. Copies Storage objects whose path contains a /{OLD}/ segment to the
 *      same path with /{NEW}/ (old objects kept until --delete-old).
 *   5. Prints the follow-ups: claims re-sync + --delete-old.
 *
 * DELIBERATELY SEPARATE (run after verifying the app against the new id):
 *   --delete-old  deletes shops/{OLD} (doc + subcollections) and the OLD-path
 *                 Storage objects. Until then everything is additive/reversible.
 *
 * NOT COVERED (accepted, verify per run):
 *   - Auth custom claims: run  node scripts/sync-admin-claims-local.cjs --commit
 *     after --commit (it derives claims from users docs, which this renames).
 *   - Historical Stripe PaymentIntent metadata (immutable) keeps the old id —
 *     only informational; refunds key off the order doc, which is renamed.
 *   - Already-sent emails contain /{OLD}/ links; they break after --delete-old
 *     of the shops doc (storefront shows "unavailable"). Test data → accepted.
 *
 * SAFETY: DRY RUN by default (counts + samples, zero writes). Idempotent:
 * field updates re-run cleanly; doc/object copies skip existing destinations.
 *
 * USAGE:
 *   node scripts/rename-shopid.cjs                                   # dry run (defaults below)
 *   node scripts/rename-shopid.cjs --old=melodieomc --new=melodie-mc # dry run, explicit
 *   node scripts/rename-shopid.cjs --commit                          # execute steps 2-4
 *   node scripts/rename-shopid.cjs --delete-old                      # final cleanup (after verify!)
 *
 * Requires Application Default Credentials (gcloud auth application-default).
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore, FieldValue } = functionsRequire('firebase-admin/firestore');
const { getStorage } = functionsRequire('firebase-admin/storage');

const STORAGE_BUCKET = 'b8shield-reseller-app.firebasestorage.app';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const DELETE_OLD = args.includes('--delete-old');
const getArg = (name, dflt) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1].trim() : dflt;
};
const OLD = getArg('old', 'melodieomc');
const NEW = getArg('new', 'melodie-mc');

// Keep in sync with src/config/tenancy.js NON_SHOP_FIRST_SEGMENTS.
const RESERVED = new Set([
  'se', 'gb', 'us', 'login', 'register', 'forgot-password', 'reset-password',
  'affiliate-login', '__', 'account', 'admin', 'platform', 'api', 'www',
]);

// Every collection that carries a `shopId` FIELD (inventory from a full code
// grep 2026-07-06 + the Phase 1 backfill list). `shops` (doc id = shopId) and
// `settings` (platform-global) are handled separately / out of scope.
const FIELD_COLLECTIONS = [
  'activities', 'adminCustomerDocuments', 'adminPresence', 'adminUIDs',
  'affiliateApplications', 'affiliateClicks', 'affiliatePayouts', 'affiliates',
  'ambassadorActivities', 'auditLogs', 'b2cCustomers', 'campaignParticipants',
  'campaignRevenueTracking', 'campaigns', 'checkoutSuppressions', 'checkouts',
  'customerDocuments', 'deferredActivities', 'discountCodes',
  'emailVerifications', 'followUps', 'impersonationAudit', 'leads',
  'marketingMaterials', 'orders', 'pages', 'passwordResets', 'podArtwork',
  'podMappings', 'productGroups', 'productReviews', 'products',
  'reviewRequests', 'reviewSuppressions', 'userMentions', 'users',
];

const BATCH_SIZE = 400;

admin.initializeApp({ projectId: 'b8shield-reseller-app', storageBucket: STORAGE_BUCKET });
const db = getFirestore('b8s-reseller-db'); // the CORRECT named database
const bucket = getStorage().bucket();

const log = (...a) => console.log(...a);

async function preflight() {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(NEW) || RESERVED.has(NEW)) {
    throw new Error(`NEW id "${NEW}" is not a valid unreserved slug`);
  }
  const oldSnap = await db.collection('shops').doc(OLD).get();
  if (!oldSnap.exists) throw new Error(`shops/${OLD} does not exist`);
  const newSnap = await db.collection('shops').doc(NEW).get();
  const pay = (oldSnap.data() || {}).payments || {};
  if (pay.stripeAccountId) {
    throw new Error(
      `shops/${OLD} already has a Stripe connected account (${pay.stripeAccountId}) — ` +
      `its metadata.shopId is immutable. Rename before onboarding, or accept the mismatch consciously.`
    );
  }
  return { oldData: oldSnap.data(), newExists: newSnap.exists };
}

// Recursively copy a document + its subcollections. Skips docs that already
// exist at the destination (idempotent re-run).
async function copyDocTree(srcRef, dstRef, stats) {
  const snap = await srcRef.get();
  if (snap.exists) {
    const dst = await dstRef.get();
    if (!dst.exists) {
      if (COMMIT) await dstRef.set(snap.data());
      stats.docsCopied += 1;
    } else {
      stats.docsSkipped += 1;
    }
  }
  const subcols = await srcRef.listCollections();
  for (const col of subcols) {
    stats.subcollections.add(col.id);
    const docs = await col.listDocuments(); // includes docs that only have subcollections
    for (const d of docs) {
      await copyDocTree(d, dstRef.collection(col.id).doc(d.id), stats);
    }
  }
}

async function renameFieldsIn(colName) {
  let updated = 0;
  // Loop because the query shrinks as we update (shopId no longer matches).
  // In dry-run we just count once.
  for (;;) {
    const snap = await db.collection(colName).where('shopId', '==', OLD).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    if (!COMMIT) return snap.size === BATCH_SIZE ? `${snap.size}+` : snap.size;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { shopId: NEW }));
    await batch.commit();
    updated += snap.size;
    if (snap.size < BATCH_SIZE) break;
  }
  return updated;
}

// Deep-rewrite every STRING value containing OLD → NEW (image download URLs
// embed the storage path, e.g. .../o/products%2F{OLD}%2Ffile?token=...; the
// copied objects keep their download tokens, so a path swap keeps URLs valid).
// Non-plain values (Timestamp etc.) pass through untouched. ⚠️ Blind substring
// replace — fine for a distinctive id like "melodieomc"; think twice if OLD
// were a common word.
function rewriteValue(v, counter) {
  if (typeof v === 'string') {
    if (v.includes(OLD)) { counter.n += v.split(OLD).length - 1; return v.split(OLD).join(NEW); }
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => rewriteValue(x, counter));
  if (v && typeof v === 'object' && v.constructor === Object) {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = rewriteValue(val, counter);
    return out;
  }
  return v;
}

async function rewriteStringsEverywhere() {
  let docs = 0, strings = 0;
  const rewriteDoc = async (snap) => {
    const counter = { n: 0 };
    const rewritten = rewriteValue(snap.data(), counter);
    if (counter.n > 0) {
      if (COMMIT) await snap.ref.set(rewritten);
      docs += 1; strings += counter.n;
    }
  };
  const shopSnap = await db.collection('shops').doc(NEW).get();
  if (shopSnap.exists) await rewriteDoc(shopSnap);
  for (const col of FIELD_COLLECTIONS) {
    const snap = await db.collection(col).where('shopId', '==', NEW).get();
    for (const d of snap.docs) await rewriteDoc(d);
  }
  log(`\n🔤 embedded-string rewrite: ${COMMIT ? 'rewrote' : 'would rewrite'} ${strings} occurrence(s) across ${docs} doc(s)`);
}

async function storageObjects() {
  // Full listing is fine at this bucket's size (hundreds of objects).
  const [files] = await bucket.getFiles();
  const seg = `/${OLD}/`;
  return files.filter((f) => f.name.startsWith(`${OLD}/`) || f.name.includes(seg));
}

async function main() {
  log(`\n🔁 Rename shopId  ${OLD}  →  ${NEW}`);
  log(`   database: b8s-reseller-db · bucket: ${STORAGE_BUCKET}`);
  log(`   mode: ${DELETE_OLD ? '🔴 DELETE-OLD' : COMMIT ? '🔴 COMMIT' : '🟡 DRY RUN (no writes)'}\n`);

  const { newExists } = await preflight();

  if (DELETE_OLD) {
    // Final cleanup: remove the old shop doc tree + old storage objects.
    const newSnap = await db.collection('shops').doc(NEW).get();
    if (!newSnap.exists) throw new Error(`shops/${NEW} missing — run --commit first`);
    const stats = { docsCopied: 0, docsSkipped: 0, subcollections: new Set() };
    // Recursively delete old doc tree.
    const deleteTree = async (ref) => {
      for (const col of await ref.listCollections()) {
        for (const d of await col.listDocuments()) await deleteTree(d);
      }
      await ref.delete();
    };
    await deleteTree(db.collection('shops').doc(OLD));
    log(`🗑  deleted shops/${OLD} (doc + subcollections)`);
    const objs = await storageObjects();
    for (const f of objs) await f.delete();
    log(`🗑  deleted ${objs.length} old storage objects`);
    log('\n✅ delete-old complete.');
    return;
  }

  // ── Step 1: shops doc tree ────────────────────────────────────────────────
  const stats = { docsCopied: 0, docsSkipped: 0, subcollections: new Set() };
  if (newExists && !COMMIT) log(`⚠️  shops/${NEW} already exists (re-run?) — copies will skip existing docs`);
  await copyDocTree(db.collection('shops').doc(OLD), db.collection('shops').doc(NEW), stats);
  log(`📄 shops doc tree: ${COMMIT ? 'copied' : 'would copy'} ${stats.docsCopied} docs` +
      (stats.docsSkipped ? ` (${stats.docsSkipped} already existed)` : '') +
      (stats.subcollections.size ? ` · subcollections: ${[...stats.subcollections].join(', ')}` : ' · no subcollections'));

  // ── Step 2: shopId field updates ──────────────────────────────────────────
  log(`\n🏷  shopId field updates (${COMMIT ? 'writing' : 'counting'}):`);
  let total = 0;
  for (const col of FIELD_COLLECTIONS) {
    const n = await renameFieldsIn(col);
    if (n && n !== 0) {
      log(`   ${String(n).padStart(6)}  ${col}`);
      total += typeof n === 'number' ? n : parseInt(n, 10);
    }
  }
  log(`   ------\n   ${String(total).padStart(6)}  total docs`);

  // ── Step 2b: embedded strings (download URLs etc.) ───────────────────────
  await rewriteStringsEverywhere();

  // ── Step 3: storage objects ───────────────────────────────────────────────
  const objs = await storageObjects();
  log(`\n🗂  storage: ${objs.length} objects under /${OLD}/`);
  objs.slice(0, 5).forEach((f) => log(`   e.g. ${f.name}`));
  if (COMMIT) {
    let copied = 0, skipped = 0;
    for (const f of objs) {
      const dstName = f.name.startsWith(`${OLD}/`)
        ? `${NEW}/${f.name.slice(OLD.length + 1)}`
        : f.name.split(`/${OLD}/`).join(`/${NEW}/`);
      const dst = bucket.file(dstName);
      const [exists] = await dst.exists();
      if (exists) { skipped += 1; continue; }
      await f.copy(dst);
      copied += 1;
    }
    log(`   copied ${copied}, skipped ${skipped} (already existed). OLD objects kept until --delete-old.`);
  }

  if (COMMIT) {
    log(`\n✅ COMMIT complete. Follow-ups, in order:`);
    log(`   1. node scripts/sync-admin-claims-local.cjs --commit   (claims carry shopId)`);
    log(`   2. Verify: admin ?shopId=${NEW}, storefront /${NEW}/, images load, orders visible.`);
    log(`   3. node scripts/rename-shopid.cjs --old=${OLD} --new=${NEW} --delete-old`);
  } else {
    log(`\n🟡 Dry run complete. Re-run with --commit to execute.`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('❌', e.message); process.exit(1); });
