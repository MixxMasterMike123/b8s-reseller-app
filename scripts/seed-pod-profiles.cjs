/**
 * seed-pod-profiles.cjs — seed the POD print spec profiles (settings/podProfiles).
 *
 * The POD validation engine reads these profiles to check uploaded artwork (DPI,
 * format, transparency, file size) per print purpose. They live in Firestore (NOT
 * code) so they can be replaced when the real print shop delivers its specs —
 * changing a profile's size/DPI auto-updates the validation thresholds.
 *
 * ⚠️ The values below are INDUSTRY-TYPICAL PLACEHOLDERS (provisional:true). The real
 * numbers come from the printer later. The app surfaces a "preliminära" banner.
 *
 * Mirrors scripts/seed-default-shop.cjs:
 *   - DRY RUN by default — prints the doc it WOULD write, then exits.
 *   - Pass `--commit` to actually write.
 *   - Idempotent: if settings/podProfiles already exists it does NOT overwrite
 *     (pass `--force` to overwrite — e.g. to push updated specs).
 *
 * USAGE (run by Mikael — live data write, STOP-and-surface class):
 *   node scripts/seed-pod-profiles.cjs            # dry run, shows the plan
 *   node scripts/seed-pod-profiles.cjs --commit   # actually write the doc
 *   node scripts/seed-pod-profiles.cjs --commit --force   # overwrite existing
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

// PROVISIONAL placeholder profiles. Shape consumed by src/utils/podValidation.js +
// src/config/podProfiles.js. accepted_formats: preferred:true marks the recommended
// format; an accepted-but-not-preferred format (e.g. jpg) warns. transparency:
// 'required' | 'optional' | 'flatten'. color_mode: 'rgb' | 'cmyk_preferred'.
const PROFILES = [
  {
    id: 'apparel_dtg',
    label: 'Textil (DTG)',
    accepted_formats: [{ ext: 'png', preferred: true }, { ext: 'tiff', preferred: false }, { ext: 'jpg', preferred: false }],
    color_mode: 'rgb',
    transparency: 'required',
    print_area_mm: { w: 300, h: 400 },
    target_dpi: 300, min_dpi: 150, bleed_mm: 0, safe_margin_mm: 0, max_file_mb: 50,
    alt_sizes: [],
  },
  {
    id: 'poster_large',
    label: 'Affisch (storformat)',
    accepted_formats: [{ ext: 'pdf', preferred: true }, { ext: 'tiff', preferred: false }, { ext: 'png', preferred: false }, { ext: 'jpg', preferred: false }],
    color_mode: 'cmyk_preferred',
    transparency: 'flatten',
    print_area_mm: { w: 420, h: 594 }, // A2
    target_dpi: 150, min_dpi: 120, bleed_mm: 3, safe_margin_mm: 5, max_file_mb: 100,
    alt_sizes: [{ label: 'A3', w: 297, h: 420 }, { label: '500×700', w: 500, h: 700 }],
  },
  {
    id: 'sticker_diecut',
    label: 'Klistermärke (stansad)',
    accepted_formats: [{ ext: 'pdf', preferred: true }, { ext: 'svg', preferred: true }, { ext: 'png', preferred: false }],
    color_mode: 'rgb',
    transparency: 'required',
    print_area_mm: { w: 150, h: 150 },
    target_dpi: 300, min_dpi: 200, bleed_mm: 3, safe_margin_mm: 3, max_file_mb: 50,
    alt_sizes: [],
  },
  {
    id: 'mug_wrap',
    label: 'Mugg (wrap)',
    accepted_formats: [{ ext: 'png', preferred: true }, { ext: 'pdf', preferred: false }],
    color_mode: 'rgb',
    transparency: 'optional',
    print_area_mm: { w: 200, h: 85 },
    target_dpi: 300, min_dpi: 200, bleed_mm: 3, safe_margin_mm: 3, max_file_mb: 50,
    alt_sizes: [],
  },
];

async function main() {
  console.log('🌱 Seed POD print profiles — settings/podProfiles');
  console.log(`   profiles: ${PROFILES.map((p) => p.id).join(', ')}`);
  console.log(`   mode:     ${COMMIT ? '🔴 COMMIT (will write)' : '🟡 DRY RUN (no write)'}`);
  console.log('');

  const ref = db.collection('settings').doc('podProfiles');
  const snap = await ref.get();
  if (snap.exists && !FORCE) {
    console.log('✅ settings/podProfiles already exists — nothing to do.');
    console.log('   (Pass --force to overwrite, e.g. to push updated specs.)');
    return;
  }

  const docData = {
    version: 1,
    provisional: true, // placeholder values — drives the "preliminära" banner
    profiles: PROFILES,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log(`📝 ${COMMIT ? 'Writing' : 'WOULD write'} settings/podProfiles:`);
  console.log(JSON.stringify({ ...docData, updatedAt: '<serverTimestamp>' }, null, 2));
  console.log('');

  if (!COMMIT) {
    console.log('🟡 Dry run complete. Re-run with --commit to write.');
    return;
  }

  await ref.set(docData, { merge: true });
  console.log('🔴 Wrote settings/podProfiles.');
  console.log('   The POD add-on validation will now read these profiles.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
