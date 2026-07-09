#!/usr/bin/env node
/**
 * render-thumbnail.mjs — render a template's admin-picker thumbnail.
 *
 * Usage:
 *   node .claude/skills/template-creator/scripts/render-thumbnail.mjs <templateId>
 *
 * Resolves the template's REAL tokens via resolveTheme(getTemplate(id).tokens)
 * so the thumbnail always reflects the actual look, builds a 16:10 storefront
 * preview HTML, and writes it to a temp file. It then prints the path to that
 * HTML plus the exact `browse` command to screenshot it to
 * public/template-thumbs/<templateId>.png (2x). We print the browse command
 * rather than run it so this stays a pure Node script with no browser dep — the
 * skill runner executes the printed command with the gstack `browse` binary.
 *
 * The template MUST already exist in src/config/templates.js (run this AFTER
 * registering the entry).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const id = process.argv[2];
if (!id) {
  console.error('Usage: render-thumbnail.mjs <templateId>');
  process.exit(1);
}

// Resolve project root from cwd (skill is invoked with cwd = project root).
const root = process.cwd();
const tokensMod = pathToFileURL(path.join(root, 'src/config/nordTokens.js')).href;
const tplMod = pathToFileURL(path.join(root, 'src/config/templates.js')).href;

const { resolveTheme } = await import(tokensMod);
const { getTemplate } = await import(tplMod);

const tpl = getTemplate(id);
if (!tpl || tpl.id !== id) {
  console.error(`Template "${id}" not found in src/config/templates.js. Register it first.`);
  process.exit(1);
}

const { vars, heroStyle } = resolveTheme(tpl.tokens);
const cssVars = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('');
const fontLink = (tpl.fonts && tpl.fonts.length)
  ? `<link href="https://fonts.googleapis.com/css2?${tpl.fonts.map((f) => 'family=' + f).join('&')}&display=swap" rel="stylesheet">`
  : `<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400..700&family=Instrument+Sans:wght@400..700&display=swap" rel="stylesheet">`;

const editorial = heroStyle === 'editorial';
// Two-letter mark for editorial hero: initials of the template name.
const mark = tpl.name.replace(/[^A-Za-zÅÄÖ]/g, '').slice(0, 2).toUpperCase() || 'AB';
const heroHTML = editorial
  ? `<div class="hero ed"><div class="mark">${mark}</div><div class="hc"><span class="kick"><i></i> Din butik</span><h1>En rubrik som visar stilen</h1><div class="cta"><span class="b1">Handla nu</span><span class="b2">Se mer</span></div></div></div>`
  : `<div class="hero bento"><div class="scrim"></div><div class="hc light"><span class="kick2">Nyheter</span><h1>Välkommen till butiken</h1><div class="cta"><span class="b1 light">Handla nu</span></div></div></div>`;
const cards = ['Produkt A', 'Produkt B', 'Produkt C', 'Produkt D'].map((n, i) =>
  `<div class="pc"><div class="ph"></div><div class="pb"><span class="cat">Kategori</span><b>${n}</b><div class="pf"><span class="pr">${299 + i * 100} kr</span><span class="add">Köp</span></div></div></div>`).join('');

const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${fontLink}<style>
  :root{${cssVars}}
  *{box-sizing:border-box;margin:0} body{background:var(--color-canvas);font-family:var(--font-body);color:var(--color-ink);width:640px;height:400px;overflow:hidden}
  .nav{display:flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-bottom:1px solid var(--color-line,rgba(0,0,0,.06));background:var(--color-surface,#fff)}
  .crest{width:22px;height:22px;border-radius:5px;background:var(--color-accent);color:#fff;display:grid;place-items:center;font-family:var(--font-display);font-size:11px}
  .logo{font-family:var(--font-display);font-size:15px;${editorial ? 'text-transform:uppercase;' : ''}}
  .cart{margin-left:auto;background:var(--color-ink);color:#fff;font-size:11px;font-weight:600;padding:5px 10px;border-radius:999px}
  .hero{margin:12px 16px;border-radius:var(--radius-tile);overflow:hidden;position:relative;height:150px}
  .hero.ed{background:var(--color-surface,#fff);border:1px solid var(--color-line,#eee);display:flex;align-items:center}
  .hero.ed .mark{position:absolute;right:-2%;top:50%;transform:translateY(-50%);font-family:var(--font-display);font-size:150px;line-height:.72;color:color-mix(in srgb,var(--color-accent) 9%,transparent)}
  .hero.ed .hc{position:relative;z-index:1;padding:20px}
  .hero.bento{background:var(--color-ink);display:flex;align-items:flex-end}
  .hero.bento .scrim{position:absolute;inset:0;background:radial-gradient(600px 300px at 80% -10%,color-mix(in srgb,var(--color-accent) 60%,var(--color-ink)),var(--color-ink))}
  .hero .hc{padding:18px}.hero .hc.light{position:relative;color:#fff}
  .kick{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;color:var(--color-ink-muted);margin-bottom:8px}.kick i{width:7px;height:7px;border-radius:2px;background:var(--color-accent)}
  .kick2{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.7)}
  .hero h1{font-family:var(--font-display);font-size:${editorial ? '26px' : '24px'};line-height:.96;${editorial ? 'text-transform:uppercase;' : ''}max-width:62%;margin:6px 0 12px}
  .cta{display:flex;gap:8px}.b1{background:var(--color-accent);color:#fff;font-weight:700;font-size:11px;padding:8px 14px;border-radius:var(--radius-el)}.b1.light{background:#fff;color:var(--color-ink)}.b2{font-size:11px;font-weight:600;padding:8px 4px;border-bottom:2px solid var(--color-line,#ccc)}
  .row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 16px}
  .pc{background:var(--color-surface,#fff);border:1px solid var(--color-line,#eee);border-radius:var(--radius-tile);overflow:hidden}
  .ph{aspect-ratio:1;background:#e6e9ee}
  .pb{padding:7px}.cat{font-size:8px;font-weight:700;text-transform:uppercase;color:var(--color-ink-faint)}.pb b{display:block;font-size:11px;margin:1px 0 5px}
  .pf{display:flex;align-items:center;justify-content:space-between}.pr{font-family:var(--font-display);font-size:11px}.add{background:var(--color-accent);color:#fff;font-size:9px;font-weight:700;padding:4px 8px;border-radius:999px}
</style></head><body>
  <div class="nav"><span class="crest">${mark}</span><span class="logo">Din Butik</span><span class="cart">Varukorg</span></div>
  ${heroHTML}
  <div style="font-family:var(--font-display);font-size:14px;${editorial ? 'text-transform:uppercase;' : ''}padding:14px 16px 8px">Våra produkter</div>
  <div class="row">${cards}</div>
</body></html>`;

const tmpHtml = path.join(root, `.template-thumb-${id}.html`);
fs.writeFileSync(tmpHtml, html);

const outDir = path.join(root, 'public/template-thumbs');
fs.mkdirSync(outDir, { recursive: true });
const outPng = path.join(outDir, `${id}.png`);

// Locate the gstack browse binary the same way the browse skill does.
const candidates = [
  path.join(root, '.claude/skills/gstack/browse/dist/browse'),
  path.join(process.env.HOME || '', '.claude/skills/gstack/browse/dist/browse'),
];
const browse = candidates.find((p) => fs.existsSync(p)) || 'browse';

console.log('THUMBNAIL_HTML=' + tmpHtml);
console.log('THUMBNAIL_PNG=' + outPng);
console.log('THUMB_ATTR=/template-thumbs/' + id + '.png');
console.log('');
console.log('Run these to render the PNG (then delete the temp html):');
console.log(`"${browse}" viewport 640x400 --scale 2`);
console.log(`"${browse}" goto "${pathToFileURL(tmpHtml).href}"`);
console.log(`"${browse}" wait --networkidle`);
console.log(`"${browse}" screenshot "${outPng}" --clip 0,0,640,400`);
console.log(`rm "${tmpHtml}"`);
