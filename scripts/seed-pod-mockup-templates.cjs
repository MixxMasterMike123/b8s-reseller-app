/**
 * seed-pod-mockup-templates.cjs — seed the Design Studio garment mockup templates
 * (settings/podMockupTemplates).
 *
 * The Design Studio (POD add-on, Mode A) composes validated artwork onto garment
 * flats. The templates below describe each garment: which SVG flat renders it, its
 * selectable colourways, and the PRINT-AREA GEOMETRY (in the SVG's 800×900 viewBox
 * pixels) together with the physical print size in millimetres. The compositor uses
 * the px↔mm pair to compute effective DPI per placement.
 *
 * ⚠️ These are PROVISIONAL, generic garment flats (provisional:true) — interim
 * templates until the real print shop delivers photographed garments + exact
 * print-area coordinates (see the handover: mockup quality is bounded by the real
 * garment catalog). The Design Studio surfaces a "preliminära" banner.
 *
 * The printAreaMm values mirror settings/podProfiles → apparel_dtg print_area_mm
 * (300×400 mm). The printAreas (px) rects are hand-tuned to sit on the front chest
 * of src/wagons/pod-wagon/studio/garments/TeeFlat.jsx / HoodieFlat.jsx (viewBox
 * 800×900) and share the same 3:4 aspect ratio as the mm size.
 *
 * Mirrors scripts/seed-pod-profiles.cjs:
 *   - DRY RUN by default — prints the doc it WOULD write, then exits.
 *   - Pass `--commit` to actually write.
 *   - Idempotent: if settings/podMockupTemplates already exists it does NOT
 *     overwrite (pass `--force` to overwrite — e.g. to push updated templates).
 *
 * USAGE (run by Mikael — live data write, STOP-and-surface class):
 *   node scripts/seed-pod-mockup-templates.cjs            # dry run, shows the plan
 *   node scripts/seed-pod-mockup-templates.cjs --commit   # actually write the doc
 *   node scripts/seed-pod-mockup-templates.cjs --commit --force   # overwrite existing
 *
 * Requires Application Default Credentials (gcloud auth application-default login)
 * OR a serviceAccountKey.json — same as the other admin scripts here.
 */

// firebase-admin is installed in functions/node_modules (not the repo root),
// so resolve it from there regardless of where this script is run from.
const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const FORCE = args.includes('--force');

admin.initializeApp(); // default credentials, like scripts/seed-default-shop.cjs
const db = getFirestore('b8s-reseller-db'); // the CORRECT named database
db.settings({ ignoreUndefinedProperties: true });

// Shared colourway palette for the apparel flats. hex fills the garment body SVG;
// works from white (#ffffff) through black (#1a1a1a).
const APPAREL_COLORWAYS = [
  { id: 'white', label: 'Vit', hex: '#ffffff' },
  { id: 'black', label: 'Svart', hex: '#1a1a1a' },
  { id: 'navy', label: 'Marinblå', hex: '#1f2a44' },
  { id: 'heather', label: 'Gråmelerad', hex: '#b7b7b7' },
];

// PROVISIONAL templates. Shape consumed by src/config/podMockupTemplates.js +
// src/wagons/pod-wagon/studio/DesignStudio.jsx.
//
// printAreas are SVG viewBox (800×900) pixel rects; printAreaMm is the physical
// print size ↔ podProfiles apparel_dtg (300×400 mm, 3:4). The rects share that 3:4
// aspect so preview scale ↔ physical scale stay consistent.
const TEMPLATES = [
  {
    id: 'tee_flat',
    label: 'T-shirt',
    garment: 'tee',
    profileId: 'apparel_dtg',
    colorways: APPAREL_COLORWAYS,
    // Front chest: centred (x 280..520 on the 196..604 torso), below the ribbed
    // collar (~y158), well above the hem (~y830). 240×320 px = 3:4.
    // Back v1 REUSES the same tee flat + an equivalent centred rect (no dedicated
    // back-view SVG yet) — the compositor treats it as the back placement.
    printAreas: {
      front: { x: 280, y: 210, w: 240, h: 320 },
      back: { x: 280, y: 200, w: 240, h: 320 },
    },
    printAreaMm: {
      front: { w: 300, h: 400 },
      back: { w: 300, h: 400 },
    },
  },
  {
    id: 'hoodie_flat',
    label: 'Hoodie',
    garment: 'hoodie',
    profileId: 'apparel_dtg',
    colorways: APPAREL_COLORWAYS,
    // Front only for v1 (a hoodie back-view flat comes with the real catalog).
    // Chest: centred (x 285..515 on the 200..600 torso), below the drawstring
    // bobbins (~y274), ABOVE the kangaroo pocket (top ~y596). 230×307 px = 3:4.
    printAreas: {
      front: { x: 285, y: 250, w: 230, h: 307 },
    },
    printAreaMm: {
      front: { w: 300, h: 400 },
    },
  },
];

async function main() {
  console.log('🌱 Seed POD mockup templates — settings/podMockupTemplates');
  console.log(`   templates: ${TEMPLATES.map((t) => t.id).join(', ')}`);
  console.log(`   mode:      ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  const ref = db.collection('settings').doc('podMockupTemplates');
  const snap = await ref.get();
  if (snap.exists && !FORCE) {
    console.log('✅ settings/podMockupTemplates already exists — nothing to do.');
    console.log('   (Pass --force to overwrite, e.g. to push updated templates.)');
    return;
  }

  const docData = {
    version: 1,
    provisional: true, // generic flats — drives the "preliminära" banner
    templates: TEMPLATES,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log(`📝 ${COMMIT ? 'Writing' : 'WOULD write'} settings/podMockupTemplates:`);
  console.log(JSON.stringify({ ...docData, updatedAt: '<serverTimestamp>' }, null, 2));
  console.log('');

  if (!COMMIT) {
    console.log('🟡 Dry run complete. Re-run with --commit to write.');
    return;
  }

  await ref.set(docData, { merge: true });
  console.log('🔴 Wrote settings/podMockupTemplates.');
  console.log('   The Design Studio will now read these templates.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
