/**
 * migrate-storage-shopid.cjs — Phase B of the tenant-isolation migration.
 *
 * Moves Firebase STORAGE objects from the old FLAT prefixes to the new
 * shopId-PARTITIONED prefixes that the hardened storage.rules now expect, and
 * repoints every Firestore field that stores a download URL / storage path so
 * the live storefront keeps rendering the same images after the cutover.
 *
 *   products/{productId}/...                  → products/{shopId}/{productId}/...
 *   branding/...                              → branding/{shopId}/...
 *   marketing-materials/generic/...           → marketing-materials/{shopId}/generic/...
 *   marketing-materials/customers/{cid}/...   → marketing-materials/{shopId}/customers/{cid}/...
 *     (incl. .../crm-documents/...)
 *   affiliates/{affiliateId}/invoices/...     → affiliates/{shopId}/{affiliateId}/invoices/...
 *   admin-documents/customers/{cid}/...       → admin-documents/{shopId}/customers/{cid}/...
 *   pages/{pageId}/attachments/...            → pages/{shopId}/{pageId}/attachments/...
 *
 * NOT migrated (deliberate): `orders/{orderId}/...` and `users/{uid}/profile.jpg`
 * — these storage paths are intentionally left flat (see storage.rules NOTE:
 * orders are keyed by an unguessable orderId and gated per-order; profile.jpg is
 * self-scoped). They have no shopId segment and are out of scope for Phase B.
 *
 * SHOP RESOLUTION:
 *   This legacy data is from the original SINGLE-shop app, so every existing
 *   file maps to DEFAULT_SHOP_ID ('b8shield') unless overridden. For products
 *   and branding the script ALSO tries to look up the owning Firestore doc's
 *   `shopId` (so multi-tenant data created before this runs lands in the right
 *   shop); if no owning doc / shopId is found it falls back to DEFAULT_SHOP_ID
 *   and LOGS the fallback. Override the blanket default with --shop=<id>.
 *
 * SAFETY (read this — touches live storage AND Firestore):
 *   - DRY RUN by default: lists what WOULD move (count + a sample per prefix)
 *     and what Firestore fields WOULD be repointed, then exits. `--commit` to
 *     actually copy + rewrite.
 *   - NON-DESTRUCTIVE COPY: it COPIES each object to the new path and leaves the
 *     ORIGINAL in place (the LEGACY storage.rules blocks still serve it, so
 *     nothing 404s mid-migration). A later, separate cleanup deletes the old
 *     objects + legacy rules (Phase B step 5) once verified. Pass --delete-old
 *     to also remove originals AFTER a successful copy (NOT recommended on the
 *     first pass).
 *   - IDEMPOTENT: an object whose destination already exists is SKIPPED; a
 *     Firestore field already pointing at a partitioned path is left untouched.
 *     Safe to re-run.
 *   - Targets the SAME bucket the app uses and the CORRECT named Firestore
 *     database `b8s-reseller-db`. Requires Application Default Credentials or a
 *     serviceAccountKey.json (same as the other admin scripts here).
 *
 * USAGE (run by Mikael — live storage + data, STOP-and-surface class):
 *   node scripts/migrate-storage-shopid.cjs                       # dry run, all prefixes
 *   node scripts/migrate-storage-shopid.cjs --only=products       # dry run, one prefix
 *   node scripts/migrate-storage-shopid.cjs --commit              # copy + repoint URLs
 *   node scripts/migrate-storage-shopid.cjs --commit --delete-old # + delete originals
 *   node scripts/migrate-storage-shopid.cjs --shop=b8shield       # force blanket shop
 *
 * RUN ORDER: deploy the new client (partitioned uploaders) FIRST so new uploads
 * already land partitioned; then run this to move the backlog; verify; then do
 * the Phase B step 5 cleanup (delete legacy objects + legacy rules blocks).
 */

// firebase-admin is installed in functions/node_modules (not the repo root),
// so resolve it from there regardless of where this script is run from — same
// pattern as backfill-shopid.cjs / purge-legacy-users.cjs.
const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');
const { getStorage } = functionsRequire('firebase-admin/storage');

// Keep in sync with src/config/tenancy.js + functions/src/config/tenancy.ts.
const DEFAULT_SHOP_ID = 'b8shield';

// The app's bucket. Matches src/firebase/config.js storageBucket. (The legacy
// `*.appspot.com` alias points at the same bucket; this is the canonical name.)
const STORAGE_BUCKET = 'b8shield-reseller-app.firebasestorage.app';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const DELETE_OLD = args.includes('--delete-old');
const onlyArg = args.find((a) => a.startsWith('--only='));
const shopArg = args.find((a) => a.startsWith('--shop='));
const FORCE_SHOP = shopArg ? shopArg.split('=')[1] : null;
const ONLY = onlyArg
  ? onlyArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
  : null;

admin.initializeApp({ storageBucket: STORAGE_BUCKET }); // default credentials
// Modular accessors (match backfill-shopid.cjs / purge-legacy-users.cjs).
// getFirestore(<id>) selects the CORRECT named database; the namespaced
// admin.firestore(arg) treats its arg as an APP, not a db id, so it would NOT
// reach b8s-reseller-db — use the modular form.
const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });
const bucket = getStorage().bucket();

// ---------------------------------------------------------------------------
// Prefix definitions. Each entry knows how to (a) list its flat objects, (b)
// derive the destination partitioned path for a given object, and (c) which
// Firestore collections reference its URLs (for the repoint pass). The actual
// URL repoint is a generic deep string-replace (rewriteRefs), so it doesn't
// matter which field a URL lives in (handles b2cImageGallery arrays, nested
// storeIdentity objects, attachments arrays, etc.).
// ---------------------------------------------------------------------------

// Build the destination path by inserting /{shopId} after the type segment.
// Generic for prefixes whose flat grammar is `<type>/<rest...>`:
//   products/<rest>            → products/<shopId>/<rest>
//   branding/<rest>            → branding/<shopId>/<rest>
//   affiliates/<rest>          → affiliates/<shopId>/<rest>
//   pages/<rest>               → pages/<shopId>/<rest>
// marketing-materials + admin-documents have a deeper grammar but the SAME
// "insert shopId right after the top type segment" rule produces the target the
// rules expect:
//   marketing-materials/generic/x          → marketing-materials/<shopId>/generic/x
//   marketing-materials/customers/cid/x     → marketing-materials/<shopId>/customers/cid/x
//   admin-documents/customers/cid/x         → admin-documents/<shopId>/customers/cid/x
const insertShopAfterType = (objectPath, shopId) => {
  const slash = objectPath.indexOf('/');
  if (slash < 0) return objectPath; // top-level object, shouldn't happen
  const type = objectPath.slice(0, slash);
  const rest = objectPath.slice(slash + 1);
  return `${type}/${shopId}/${rest}`;
};

// A flat object is "already partitioned" if its first path segment after the
// type IS a known shopId-looking segment we just inserted. We can't know all
// shop ids cheaply, so the idempotency guard is destination-existence (below).
// But we DO skip objects that already sit under one of the NEW grammars to
// avoid re-processing files uploaded by the new client. Heuristic per prefix:
const PREFIXES = {
  products: {
    flatPrefix: 'products/',
    // products/{shopId}/{productId}/... is NEW; products/{productId}/... is OLD.
    // We can't distinguish shopId from productId by name alone, so rely on the
    // owning-doc lookup + destination-exists guard. Treat every products/ object
    // as a candidate; resolveShop dedupes via the productId→shopId map.
    collections: ['products'],
    resolveShop: 'product', // look up products/{productId}.shopId
  },
  branding: {
    flatPrefix: 'branding/',
    collections: ['shops', 'settings'], // storeIdentity nested URLs
    resolveShop: 'branding', // branding has no owning doc keyed by file → default/force
  },
  'marketing-materials': {
    flatPrefix: 'marketing-materials/',
    collections: ['marketingMaterials', 'adminCustomerDocuments', 'customerDocuments', '__userMarketingMaterials'],
    resolveShop: 'default',
  },
  affiliates: {
    flatPrefix: 'affiliates/',
    collections: ['affiliatePayouts'],
    resolveShop: 'default',
  },
  'admin-documents': {
    flatPrefix: 'admin-documents/',
    collections: ['adminCustomerDocuments'],
    resolveShop: 'default',
  },
  pages: {
    flatPrefix: 'pages/',
    collections: ['pages'],
    resolveShop: 'default',
  },
};

// Encode a storage path the way Firebase download URLs do (the segment between
// `/o/` and `?` is encodeURIComponent of the full object path).
const enc = (p) => encodeURIComponent(p);

// Deep-replace every occurrence of `fromPath` (raw) and its URL-encoded form
// with `toPath` inside an arbitrary JSON-ish value. Returns { value, hits }.
const deepReplace = (value, fromPath, toPath) => {
  let hits = 0;
  const fromEnc = enc(fromPath);
  const toEnc = enc(toPath);
  const walk = (v) => {
    if (typeof v === 'string') {
      let out = v;
      if (out.includes(fromEnc)) { out = out.split(fromEnc).join(toEnc); hits++; }
      // raw path (e.g. a bare storagePath field) — guard against the encoded
      // replace having already handled it (encoded form contains no '/').
      if (out.includes(fromPath)) { out = out.split(fromPath).join(toPath); hits++; }
      return out;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v)) o[k] = walk(v[k]);
      return o;
    }
    return v;
  };
  return { value: walk(value), hits };
};

// ---------------------------------------------------------------------------
// Shop resolution
// ---------------------------------------------------------------------------
let productShopMap = null; // productId → shopId (lazy)
const buildProductShopMap = async () => {
  if (productShopMap) return productShopMap;
  productShopMap = new Map();
  const snap = await db.collection('products').get();
  snap.forEach((d) => {
    const sid = (d.data() || {}).shopId;
    if (sid) productShopMap.set(d.id, sid);
  });
  return productShopMap;
};

// Resolve the destination shopId for a given flat object.
const resolveShopForObject = async (prefixKey, objectPath) => {
  if (FORCE_SHOP) return { shopId: FORCE_SHOP, source: 'forced' };
  const def = PREFIXES[prefixKey];
  if (def.resolveShop === 'product') {
    // products/{productId}/{file}
    const parts = objectPath.split('/'); // ['products', productId, ...]
    const productId = parts[1];
    const map = await buildProductShopMap();
    const sid = map.get(productId);
    if (sid) return { shopId: sid, source: `product:${productId}` };
    return { shopId: DEFAULT_SHOP_ID, source: `default (no shopId on products/${productId})` };
  }
  // branding / marketing-materials / affiliates / admin-documents / pages:
  // single-shop legacy data → default shop (overridable with --shop).
  return { shopId: DEFAULT_SHOP_ID, source: 'default (legacy single-shop)' };
};

// Skip objects already living under a partitioned grammar created by the NEW
// client. We can't enumerate all shop ids, but the destination-exists guard
// below makes the copy idempotent regardless. This heuristic just avoids noisy
// "would move" lines for already-correct files when --shop matches.
const looksAlreadyPartitioned = (prefixKey, objectPath, shopId) =>
  objectPath.startsWith(`${prefixKey}/${shopId}/`);

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
async function migratePrefix(prefixKey) {
  const def = PREFIXES[prefixKey];
  const [files] = await bucket.getFiles({ prefix: def.flatPrefix });

  const plan = []; // { from, to, shopId, source }
  let skippedPartitioned = 0;
  for (const f of files) {
    const objectPath = f.name;
    if (objectPath.endsWith('/')) continue; // folder placeholder
    const { shopId, source } = await resolveShopForObject(prefixKey, objectPath);
    if (looksAlreadyPartitioned(prefixKey, objectPath, shopId)) { skippedPartitioned++; continue; }
    const to = insertShopAfterType(objectPath, shopId);
    if (to === objectPath) continue;
    plan.push({ from: objectPath, to, shopId, source });
  }

  console.log(`\n▼ ${prefixKey}/  — ${files.length} objects, ${plan.length} to move` +
    (skippedPartitioned ? `, ${skippedPartitioned} already partitioned` : ''));
  // Sample
  plan.slice(0, 5).forEach((p) =>
    console.log(`    ${p.from}\n      → ${p.to}   [shop=${p.shopId} via ${p.source}]`));
  if (plan.length > 5) console.log(`    …and ${plan.length - 5} more`);

  if (!COMMIT) return { prefix: prefixKey, planned: plan.length, copied: 0, refDocsUpdated: 0 };

  // 1) COPY objects (idempotent: skip if destination already exists).
  let copied = 0;
  for (const p of plan) {
    const dest = bucket.file(p.to);
    const [exists] = await dest.exists();
    if (exists) continue;
    await bucket.file(p.from).copy(dest);
    copied++;
    if (DELETE_OLD) await bucket.file(p.from).delete().catch(() => {});
    if (copied % 50 === 0) console.log(`    …copied ${copied}/${plan.length}`);
  }
  console.log(`    copied ${copied} object(s)${DELETE_OLD ? ' (+deleted originals)' : ''}`);

  // 2) REPOINT Firestore URL/path fields. We deep-replace each old path with its
  //    new path across the referencing collections. Build a quick lookup of
  //    from→to for this prefix, then scan the collections once.
  const pathPairs = plan.map((p) => [p.from, p.to]);
  let refDocsUpdated = 0;
  const collections = def.collections.filter((c) => c !== '__userMarketingMaterials');
  for (const coll of collections) {
    refDocsUpdated += await repointCollection(coll, pathPairs);
  }
  // users/{uid}/marketingMaterials subcollection (customer materials).
  if (def.collections.includes('__userMarketingMaterials')) {
    refDocsUpdated += await repointUserMarketingMaterials(pathPairs);
  }
  console.log(`    repointed ${refDocsUpdated} Firestore doc(s)`);

  return { prefix: prefixKey, planned: plan.length, copied, refDocsUpdated };
}

// Apply all from→to path rewrites to every doc in a top-level collection.
async function repointCollection(coll, pathPairs) {
  const snap = await db.collection(coll).get();
  let updated = 0;
  for (const d of snap.docs) {
    let data = d.data();
    let totalHits = 0;
    for (const [from, to] of pathPairs) {
      const { value, hits } = deepReplace(data, from, to);
      data = value; totalHits += hits;
    }
    if (totalHits > 0) { await d.ref.set(data); updated++; }
  }
  return updated;
}

// Customer marketing materials live in users/{uid}/marketingMaterials.
async function repointUserMarketingMaterials(pathPairs) {
  const usersSnap = await db.collection('users').get();
  let updated = 0;
  for (const u of usersSnap.docs) {
    const matsSnap = await u.ref.collection('marketingMaterials').get();
    for (const d of matsSnap.docs) {
      let data = d.data();
      let totalHits = 0;
      for (const [from, to] of pathPairs) {
        const { value, hits } = deepReplace(data, from, to);
        data = value; totalHits += hits;
      }
      if (totalHits > 0) { await d.ref.set(data); updated++; }
    }
  }
  return updated;
}

async function main() {
  console.log('🗂  Migrate storage to shopId-partitioned paths — tenant-isolation Phase B');
  console.log(`   bucket:    ${STORAGE_BUCKET}`);
  console.log(`   database:  b8s-reseller-db`);
  console.log(`   shop:      ${FORCE_SHOP ? `FORCED ${FORCE_SHOP}` : `per-object (default ${DEFAULT_SHOP_ID})`}`);
  console.log(`   mode:      ${COMMIT ? '🔴 COMMIT (copy + repoint URLs)' : '🟡 DRY RUN (no writes)'}` +
    (COMMIT && DELETE_OLD ? '  +DELETE-OLD' : ''));

  const keys = ONLY ? Object.keys(PREFIXES).filter((k) => ONLY.includes(k)) : Object.keys(PREFIXES);
  if (ONLY) {
    const unknown = ONLY.filter((k) => !PREFIXES[k]);
    if (unknown.length) {
      console.error(`❌ Unknown --only prefix(es): ${unknown.join(', ')}. Allowed: ${Object.keys(PREFIXES).join(', ')}`);
      process.exit(1);
    }
  }

  const results = [];
  for (const k of keys) results.push(await migratePrefix(k));

  const totalPlanned = results.reduce((s, r) => s + r.planned, 0);
  console.log('');
  if (!COMMIT) {
    console.log(`🟡 Dry run complete. ${totalPlanned} object(s) would be COPIED to partitioned paths,`);
    console.log('   and the referencing Firestore URL/path fields would be repointed.');
    console.log('   Originals are KEPT (legacy rules still serve them). Re-run with --commit to execute.');
  } else {
    const totalCopied = results.reduce((s, r) => s + r.copied, 0);
    const totalRefs = results.reduce((s, r) => s + r.refDocsUpdated, 0);
    console.log(`🔴 Migration complete. Copied ${totalCopied} object(s); repointed ${totalRefs} Firestore doc(s).`);
    console.log('   Verify storefront images render, then do Phase B step 5 (delete old objects + legacy rules).');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); });
