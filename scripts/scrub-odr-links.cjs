/**
 * scrub-odr-links.cjs — find (and optionally scrub) references to the EU ODR
 * platform in existing CMS pages.
 *
 * WHY: the EU Online Dispute Resolution platform (ec.europa.eu/consumers/odr)
 * was DISCONTINUED on 20 July 2025. A live link to it on a shop's legal pages is
 * misleading to consumers. Dispute resolution must point to ARN (arn.se) and,
 * cross-border, the EU list of national ADR bodies
 * (consumer-redress.ec.europa.eu/dispute-resolution-bodies). The NEW
 * auto-generated legal pages already use the correct references; this script
 * cleans up any STALE hand-authored CMS pages still linking to ODR.
 *
 * SCOPE: the `pages` collection only (the CMS content pages). The auto-generated
 * legal pages are code (legalTemplates.js) and never contain ODR links.
 *
 * SAFETY (mirrors scripts/backfill-shopid.cjs conventions):
 *   - DRY RUN by default: prints every offending page (shopId, slug, id, which
 *     fields/languages contain an ODR reference, and a snippet) and exits with
 *     NO writes. Pass `--commit` to actually scrub.
 *   - Scrub action when --commit: removes the ODR <a> anchor/url from the HTML
 *     content, replacing a linked anchor with its inner text (so the surrounding
 *     sentence survives) and bare URLs with the ARN/EU-ADR guidance text. It
 *     does NOT delete the page or other content.
 *   - Idempotent: re-running finds nothing once scrubbed.
 *   - Per-page reversible only via Firestore history — this REWRITES content, so
 *     it is a STOP-and-surface / operator-run script (run by Mikael).
 *
 * USAGE:
 *   node scripts/scrub-odr-links.cjs              # dry run — report only
 *   node scripts/scrub-odr-links.cjs --commit     # scrub the offending pages
 *
 * Requires Application Default Credentials (like the other admin scripts here).
 */

const path = require('path');
const { createRequire } = require('module');
const functionsRequire = createRequire(path.join(__dirname, '..', 'functions', 'package.json'));
const admin = functionsRequire('firebase-admin');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

admin.initializeApp(); // default credentials, like the other admin scripts here
const db = getFirestore('b8s-reseller-db'); // the CORRECT named database

const COMMIT = process.argv.includes('--commit');

// Patterns that identify the discontinued EU ODR platform. Deliberately broad —
// matches the canonical host and the common variants people pasted.
const ODR_PATTERNS = [
  /ec\.europa\.eu\/consumers\/odr/i,
  /ec\.europa\.eu\/odr/i,
  /webgate\.ec\.europa\.eu\/odr/i,
  /\bodr\b[^<]{0,40}ec\.europa\.eu/i,
];

const hasOdr = (str) => typeof str === 'string' && ODR_PATTERNS.some((re) => re.test(str));

// Replace an <a ...odr-url...>text</a> with just "text"; replace a bare ODR URL
// with neutral guidance. Conservative: only touches ODR references.
function scrubHtml(html) {
  if (typeof html !== 'string') return html;
  let out = html;
  // 1) Anchors whose href points at the ODR platform → keep inner text only.
  out = out.replace(
    /<a\b[^>]*href=["'][^"']*(?:ec\.europa\.eu\/(?:consumers\/)?odr|webgate\.ec\.europa\.eu\/odr)[^"']*["'][^>]*>(.*?)<\/a>/gis,
    '$1'
  );
  // 2) Any remaining bare ODR URLs → ARN / EU-ADR guidance (Swedish).
  out = out.replace(
    /https?:\/\/[^\s"'<>]*ec\.europa\.eu\/(?:consumers\/)?odr[^\s"'<>]*/gi,
    'Allmänna reklamationsnämnden (ARN), www.arn.se'
  );
  out = out.replace(
    /https?:\/\/webgate\.ec\.europa\.eu\/odr[^\s"'<>]*/gi,
    'Allmänna reklamationsnämnden (ARN), www.arn.se'
  );
  return out;
}

// A page's content/title/etc are multilingual objects { 'sv-SE': '...', ... }.
// Walk every string leaf, report/scrub the ones with ODR refs.
function scanMultilingualField(value) {
  // Returns { hits: [{lang, snippet}], scrubbed: <new value or undefined> }.
  if (typeof value === 'string') {
    if (!hasOdr(value)) return { hits: [], scrubbed: undefined };
    return { hits: [{ lang: '(plain)', snippet: snippet(value) }], scrubbed: scrubHtml(value) };
  }
  if (value && typeof value === 'object') {
    const hits = [];
    const next = { ...value };
    let changed = false;
    for (const [lang, str] of Object.entries(value)) {
      if (hasOdr(str)) {
        hits.push({ lang, snippet: snippet(str) });
        next[lang] = scrubHtml(str);
        changed = true;
      }
    }
    return { hits, scrubbed: changed ? next : undefined };
  }
  return { hits: [], scrubbed: undefined };
}

const snippet = (str) => {
  const m = str.match(/.{0,40}(?:ec\.europa\.eu\/(?:consumers\/)?odr|webgate\.ec\.europa\.eu\/odr).{0,40}/i);
  return (m ? m[0] : str.slice(0, 80)).replace(/\s+/g, ' ').trim();
};

async function main() {
  console.log(`\nODR-link scrub — ${COMMIT ? 'COMMIT (will write)' : 'DRY RUN (no writes)'}\n`);

  const snap = await db.collection('pages').get();
  console.log(`Scanning ${snap.size} CMS page(s) in 'pages'…\n`);

  const FIELDS = ['content', 'title', 'metaTitle', 'metaDescription'];
  let offending = 0;
  let batch = db.batch();
  let pending = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const update = {};
    const reportLines = [];

    for (const field of FIELDS) {
      if (!(field in data)) continue;
      const { hits, scrubbed } = scanMultilingualField(data[field]);
      if (hits.length) {
        for (const h of hits) reportLines.push(`    ${field} [${h.lang}]: …${h.snippet}…`);
        if (scrubbed !== undefined) update[field] = scrubbed;
      }
    }

    if (reportLines.length) {
      offending++;
      console.log(`• shop=${data.shopId || '(none)'}  slug=${data.slug || '(none)'}  id=${docSnap.id}`);
      reportLines.forEach((l) => console.log(l));
      if (COMMIT && Object.keys(update).length) {
        batch.update(docSnap.ref, update);
        pending++;
        if (pending >= 400) { // stay under Firestore's 500/commit limit
          batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
      console.log('');
    }
  }

  if (COMMIT && pending > 0) await batch.commit();

  console.log('────────────────────────────────────────');
  if (offending === 0) {
    console.log('✓ No CMS pages reference the EU ODR platform. Nothing to scrub.');
  } else if (COMMIT) {
    console.log(`✓ Scrubbed ODR references in ${offending} page(s).`);
  } else {
    console.log(`Found ${offending} page(s) referencing the EU ODR platform.`);
    console.log('Re-run with --commit to scrub them (operator action — rewrites content).');
  }
  console.log('');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
