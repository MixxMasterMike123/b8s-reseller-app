/**
 * Backfill missing product SKUs (per-shop unique), derived from the product name.
 *
 * WHY: SKU is the product lookup key (URL resolution, cart, checkout server
 * repricing, POD podMappings). A product saved without a SKU is unreachable —
 * its storefront link falls back to the raw doc id, which the product page
 * can't resolve, so it redirects to the list. This stamps a name-derived,
 * per-shop-unique SKU on every product that lacks one, matching exactly what
 * ProductForm now does on save (skuFromName + uniqueSku).
 *
 * SAFE: dry-run by default (prints the plan, writes nothing). Re-run with
 * --commit to apply. Idempotent — a product that already has a SKU is skipped,
 * so a second --commit run reports 0 changes. Named DB b8s-reseller-db.
 *
 *   node scripts/backfill-product-sku.cjs            # dry run
 *   node scripts/backfill-product-sku.cjs --commit   # apply
 */
const { createRequire } = require('module');
const path = require('path');
const req = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const { Firestore } = req('@google-cloud/firestore');

const COMMIT = process.argv.includes('--commit');
const db = new Firestore({ projectId: 'b8shield-reseller-app', databaseId: 'b8s-reseller-db' });

// Mirror of src/utils/productUrls.js slugify — kept in sync by hand (Node has no
// ESM import of the src file here). Any change to slugify MUST be mirrored.
const slugify = (str) =>
  (!str ? '' : String(str)
    .toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-'));

// Mirror of skuFromName: url-safe, NO underscore (getSkuFromSlug splits on '_').
const skuFromName = (name) => {
  const base = slugify(name).replace(/_/g, '-').replace(/\-\-+/g, '-').replace(/^-|-$/g, '');
  return base || 'produkt';
};

const plainName = (n) => (typeof n === 'string' ? n : (n && (n['sv-SE'] || Object.values(n).find((v) => typeof v === 'string'))) || '');

(async () => {
  const snap = await db.collection('products').get();

  // Build per-shop taken-SKU sets first (so generated SKUs are unique).
  const takenByShop = {};
  const missing = [];
  snap.forEach((doc) => {
    const d = doc.data();
    const shop = d.shopId || '(none)';
    const sku = (d.sku || '').trim();
    (takenByShop[shop] ??= new Set());
    if (sku) takenByShop[shop].add(sku.toLowerCase());
    else missing.push({ id: doc.id, shop, name: plainName(d.name) });
  });

  console.log(`Scanned ${snap.size} products. Missing SKU: ${missing.length}.`);
  if (!missing.length) { console.log('Nothing to do.'); return; }

  const uniqueSku = (base, taken) => {
    const root = (base || 'produkt').toLowerCase();
    if (!taken.has(root)) return base || 'produkt';
    for (let n = 2; n < 10000; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
    return `${root}-${Date.now()}`;
  };

  const plan = [];
  for (const m of missing) {
    const taken = (takenByShop[m.shop] ??= new Set());
    const sku = uniqueSku(skuFromName(m.name), taken);
    taken.add(sku.toLowerCase()); // reserve so two blank-name products don't collide
    plan.push({ ...m, sku });
  }

  console.log('\nPlan:');
  plan.forEach((p) => console.log(`  ${p.shop}  ${p.id}  "${p.name}"  ->  sku="${p.sku}"`));

  if (!COMMIT) { console.log('\nDRY RUN — re-run with --commit to apply.'); return; }

  console.log('\nApplying…');
  let done = 0;
  for (const p of plan) {
    await db.collection('products').doc(p.id).update({ sku: p.sku, updatedAt: new Date() });
    done++;
    console.log(`  ✓ ${p.id} -> ${p.sku}`);
  }
  console.log(`\nDone. Stamped ${done} product(s).`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
