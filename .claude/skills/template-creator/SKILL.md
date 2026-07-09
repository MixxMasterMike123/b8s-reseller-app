---
name: template-creator
description: >-
  Create a new storefront TEMPLATE for this webshop platform from a design brief
  and optional reference image(s). Use this whenever the user wants a new shop
  "template", "theme", "look", "design preset", or "storefront style" — e.g.
  "make a template for restaurants", "build a bold minimalist theme", "create a
  template that looks like this" (with an image), or "add a florist look to the
  picker". The skill turns a brief (+ any uploaded reference images, whose
  palette/type/density/mood it honors) into a NORD_TOKENS partial, shows 2-3
  preview directions to pick from, then encodes the winner into templates.js,
  renders its admin-picker thumbnail, and registers it. Trigger it even if the
  user only describes a vibe ("something warm and editorial for a bakery")
  without saying the word "template".
---

# Storefront template creator

This skill codifies the process of adding a new curated **template** to this
platform's storefront, so a shop owner can pick it in `/admin/butik → Mall` and
have the whole storefront re-skin.

## The core idea (read this first — it's the whole guardrail)

A template is **NOT new markup or a cloned layout**. It is a *partial of the
NORD token contract* — a small object of color/type/shape/motion/structure
values that the existing storefront components read at runtime. Every shop
renders the same battle-tested React components; a template only changes the
CSS-variable values (and one `heroStyle` branch). This is what keeps checkout,
tenant isolation, and accessibility intact no matter what a template looks like.

So your job is **never** "write a storefront" — it's "choose good token values
(and optionally a hero variant) that express the brief, and register them." If
you catch yourself writing bespoke page layout or per-template component code,
stop: that breaks the contract. The only sanctioned component change is adding a
new `heroStyle` variant (rare — see step 6).

Read `references/token-contract.md` before choosing any values. It is the
exhaustive list of what a template may set and the allowed ranges. A value
outside it will be dropped at runtime, so picking one is wasted work.

## CORE RULE — vary structure, not just fonts and colors

The failure mode of this skill is a template that changes only the accent color
and the display font. If the product cards, the grid, and the hero are the same
as every other template, then nothing meaningful changed — it's a recolor, not a
template, and it defeats the entire point. A shop owner switching templates must
SEE a different storefront, not the same layout in a new color.

So every template you make MUST deliberately differ on the STRUCTURAL tokens,
not just color/type:
- `layout.cardStyle` — the single highest-impact choice. Cards fill most of the
  storefront; a different card design (elevated / flat / bordered / overlay) is
  what makes a template read as genuinely different. **Do not leave this at the
  default `elevated` unless the brief truly is warm-premium-calm.** Pick the
  variant that fits the register, and avoid reusing another template's cardStyle.
- `layout.gridStyle` — the PRIMARY grid axis and the highest-impact structural
  lever after cardStyle. It's not just a column count: `mosaic`/`offset`/`runway`
  change the grid's SHAPE (`grid-3`/`grid-4`/`grid-5` are uniform N-col). Vary it
  deliberately; don't leave it at `grid-4`. (`layout.gridCols` 3|4 is only a
  legacy alias for column count — set `gridStyle`, not gridCols.)
- `layout.density` — vary the section rhythm too.
- `layout.heroStyle` — bento vs editorial is a big structural difference; use it.

When you present directions in step 4, if two of your directions differ only in
color/font, that's a red flag — push them apart on cardStyle/gridStyle/hero. A
good set of directions looks structurally distinct at a glance, not just re-tinted.

## When reference images are provided

The user may upload image(s) — an existing brand site, a competitor, a mood
board, a logo, a photo. **Honor them as a STYLE guide, not a layout to copy.**
Extract palette, type personality, density, shape language, and mood from the
image and map those to token values. Do not try to reproduce the image's
structure — that would drift back into cloning and break the contract. The
output is still a clean NORD_TOKENS partial rendered by our components.
`references/image-style-extraction.md` is the procedure for reading an image
into tokens without slop.

## Workflow

### 0. Preflight — trust the code, not this doc (mandatory)

This skill's reference docs drift behind the code (they have before). Before you
author anything, open `src/config/nordTokens.js` and diff its live `TOKEN_ENUMS`
and `NORD_TOKENS` shape against what `references/token-contract.md` claims — enum
members, default values, the `layout` keys. On ANY mismatch the CODE wins; author
against the code. If you find a divergence, fix the reference doc as part of this
template's PR so the next run starts clean. (Concrete tells this matters: the grid
axis is `layout.gridStyle`, not just `gridCols`; `heroStyle` is only
`['bento','editorial']`.)

Two skills shape HOW you build here — load them at the start and keep them on:
- **`impeccable`** — the design-quality / anti-AI-slop rulebook. Load and follow
  it when authoring the previews (step 4) and the final template. An impeccable
  design hook also scans edits; treat anything it flags as required review, not
  advisory.
- **`ponytail`** — laziest-solution-that-works thinking. A template is TOKENS
  ONLY. Resist inventing new mechanisms, components, or CSS: if a combination of
  existing tokens achieves the look, that IS the solution. Reaching for bespoke
  code is the failure mode this whole skill guards against.

### 1. Understand the brief

Get three things (ask only if genuinely missing — infer from context first):
- **Who it's for** (the shop archetype: restaurant, florist, sports club, POD…).
- **Three feeling-words** (e.g. `warm · editorial · calm` or `fast · bold · loyal`).
- **A physical-scene sentence** — one concrete sentence placing a person using
  this shop in the real world ("a florist's counter at 8am, cold light, buckets
  of stems, someone wrapping a bouquet"). This forces specific token choices;
  vague briefs produce generic slop. If you can't write a scene sentence, the
  brief is too thin — ask one question.

If images were provided, run the image-style-extraction procedure now and fold
its findings into the brief.

### 2. Load the guardrail + read existing templates

Read `references/token-contract.md` (the exhaustive list of what you may set and
the allowed ranges). Read the existing `src/config/templates.js` and
`src/config/nordTokens.js` so you match the exact entry shape and don't duplicate
an existing template's id. (Registration happens later, in steps 6-7 — nothing
is written here; this is just loading context.)

### 3. Choose an anti-slop lane (crucial)

Before picking colors, name what you are NOT going to do. Every archetype has a
first-reflex look (sports→purple-gradient-esports; bakery→warm-cream-editorial;
tech→navy-and-gradient). Those are the training-data defaults and they read as
"AI made this." Pick a *specific* lane with a reason. Bans that always apply:
warm cream/beige/sand canvas (the saturated 2026 AI default), purple gradients,
glassmorphism, gradient text (`background-clip:text`), colored card side-stripes,
per-section uppercase eyebrows, `01/02/03` numbered scaffolding. If an uploaded
image legitimately IS in one of these lanes (it's the real brand), identity-
preservation wins — honor it.

### 4. Generate 2-3 token-direction previews

Produce 2-3 **distinct** interpretations of the brief as self-contained HTML
mockups (this harness has no image generation, so HTML previews are the
substitute). Each preview:
- Defines the template's token values as `:root` CSS custom properties using the
  EXACT contract variable names (`--color-accent`, `--font-display`,
  `--radius-tile`, etc. — see `TOKEN_CSS_VAR` in nordTokens.js for the full map)
  so the doc doubles as the token spec you'll transcribe in step 5. Note the grid
  is NOT a CSS var: `resolveTheme` no longer emits `--nord-grid-cols`. `gridStyle`
  is class-based — StoreSettingsContext runs `nordGridLayout(gridStyle)` into
  `store.__grid` ({ container, cellClass }) and the storefront pages apply those
  Tailwind classes. So in a preview, express the grid with the container/cell
  classes from `nordGridLayout`, not a CSS variable.
- Renders a realistic storefront slice: nav, hero (in the direction's heroStyle),
  a product grid, one supporting band, footer. Real copy in the shop's language,
  real product-ish names — never "Product 1".
- Obeys every anti-slop ban from step 3.

If you have the Workflow tool and the directions are independent, generate them
in parallel (one agent per direction) for speed; otherwise write them inline.
Save previews to `src/dev/template-previews/<templateId>-<A|B|C>.html`.

Run the slop check on them before showing the user — it catches the mechanical
tells (overused display fonts, gradient text, too many em-dashes, warm-cream
canvas) that read as "AI made this." If the Impeccable skill is installed in this
project (`.claude/skills/impeccable`), use its detector:
`node .claude/skills/impeccable/scripts/detect.mjs --json <preview files>`.
Otherwise eyeball against the ban list in step 3. Fix what it flags unless it's a
justified false positive; say which and why.

### 5. Let the user pick — then STOP and confirm

Present the 2-3 directions with a short, honest read of each (what it commits to,
which is strongest, the tradeoffs). Recommend one. **Wait for the user to pick
or tweak.** They may combine ("A's hero + B's color") or adjust — incorporate it.
Do not encode anything until they've chosen. This is the moment they shape the
output; skipping it wastes the whole run.

### 6. Encode the winner as a token partial

Transcribe the chosen direction's tokens into a `templates.js` entry — a partial
of NORD_TOKENS. Only include keys that *differ* from NORD (omitted keys inherit
the default; a leaner partial is clearer and safer). Validate every structural
value against `TOKEN_ENUMS` (gridStyle ∈ {grid-3,grid-4,grid-5,mosaic,offset,
runway}, density ∈ {compact,cozy,airy}). Set `layout.gridStyle` — it's the real
grid axis; `gridCols` (3|4) is only a legacy alias. For `heroStyle` the enum is
now exactly **`['bento','editorial']`** — anything else (e.g. the old
`full`/`split`) is not valid and `resolveTheme` drops it back to bento. So pick
bento or editorial unless you're prepared to implement a new hero variant below.

- If the winning hero uses `bento` or `editorial`, you're done here — just set
  `layout.heroStyle`.
- If it needs a **new** hero treatment not yet in the storefront, that's the ONE
  sanctioned component change: add the variant branch in the hero component
  (`src/pages/shop/PublicStorefront.jsx`), add its name to `TOKEN_ENUMS.
  'layout.heroStyle'` in `nordTokens.js`, and keep it a clean conditional so
  other templates are untouched. Prefer reusing an existing heroStyle when it
  fits — new hero variants are real work and a maintenance surface.

If the template swaps fonts, add the Google Fonts families to the entry's `fonts`
array. **`fonts` is a TOP-LEVEL entry field — a sibling of `tokens`, NOT nested
inside it** (`{ id, name, tagline, thumb, tokens: {…}, fonts: [...] }`). Each item
must be an exact Google Fonts css2 `family=` value: the family with `+` for
spaces and any axis suffix — e.g. `'Archivo+Black'`, `'Oswald:wght@500;600;700'`,
`'Archivo:ital,wght@0,400;0,700;1,600'`. `ensureTemplateFonts()` injects these as
a `<link>` at runtime. This array is the ONLY thing that loads the webfont: if
`tokens.fonts.display` names a family that isn't in this array, the font never
loads and the display face silently falls back to system fonts (a common, easy-to-
miss break). So every non-NORD face in `tokens.fonts` MUST have a matching entry
in `fonts`.

**Registering the entry** (hand-edit `src/config/templates.js`, matching the
existing entries' shape exactly):
1. Add `export const <ID>_TEMPLATE = { id, name, tagline, thumb, tokens: {…}, fonts: [] };`
   after the last template.
2. Add it to the `TEMPLATES` array (order = picker order; keep NORD first).
That's the whole registration — the admin picker maps over `TEMPLATES`
automatically, so no picker/UI code changes. Confirm the `id` isn't already
used before adding.

### 7. Render the thumbnail + register in the picker

Run `scripts/render-thumbnail.mjs <templateId>` (from the repo root — it resolves
paths off cwd) — it resolves the template's real tokens (honoring its cardStyle +
gridStyle), writes the 16:10 preview HTML to a temp file, and prints the exact
`browse` commands to screenshot it to `public/template-thumbs/<templateId>.png`
(the image the admin picker shows). Run those printed commands, then delete the
temp HTML and set the entry's `thumb` to that path. Rendering needs the gstack
`browse` binary (`~/.claude/skills/gstack/browse`); on a machine without it,
render the temp HTML by any other means and screenshot it at 640×400. The picker
auto-lists everything in `TEMPLATES`, so no picker code changes are needed —
adding the entry + thumbnail is the whole registration.

### 8. Verify

- `npm run build` must pass (a bad token partial or unbalanced hero JSX fails
  here).
- Confirm the thumbnail renders and reads as distinct from the other templates.
- Sanity-check the token layering: a shop on this template with its OWN accent
  set should show its accent, not the template default (the per-shop accent
  always wins — that's by design).
- Do NOT deploy. Report what changed and let the user commit/deploy on their go.

## Output summary

State plainly: the new template's id/name, which direction won and why, the
token values it sets, whether a new heroStyle was added, the files changed
(`templates.js`, thumbnail, maybe the hero component), and that build passed.
Note it's a no-op for existing shops until one selects it.

## What this skill deliberately does not do

- It doesn't build merchant-facing "prompt your own design" UI — it's an internal
  authoring tool for creating curated templates.
- It doesn't clone uploaded designs pixel-for-pixel — images guide style only.
- It doesn't deploy or commit — the user controls that.
