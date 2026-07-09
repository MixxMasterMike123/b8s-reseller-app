# Reading a reference image into tokens

The user can upload image(s) as a visual guide: an existing brand site, a
competitor storefront, a mood board, a logo, product photography, a physical
package. Your job is to extract the image's **style** and map it to NORD token
values — NOT to reproduce its layout. The output is always a clean token partial
rendered by our components. Copying structure breaks the component contract and
produces slop; honoring feel produces an on-brand template.

## How to look at the image

Read the image with the Read tool (it renders visually). Then extract, in order:

### 1. Palette → color tokens
- Identify the **dominant background** — is it light or dark, warm or cool, tinted
  or neutral? → `canvas`. Resist auto-warming: if the image is a cool white,
  don't translate it to cream (the AI default). Match the actual temperature.
- Find the **one action/brand color** (the color a CTA, logo, or key accent
  uses). → `accent`. Verify it passes AA on white; if the brand color is too
  light for button text, deepen it for `accent` and note that.
- Find the **darkest text color** → `ink`; derive `inkMuted`/`inkFaint` as
  lighter steps of the same hue (not pure gray if the image's text is tinted).
- `surface` is usually white or a hair off the canvas; match what cards use.
- Pull `line` from the image's hairline/border color if visible, else a faint ink.

Name the palette in words before writing hex ("cool paper white, ink near-black,
one electric-blue accent, hairline cool-gray") — it keeps you honest about
temperature and saturation.

### 2. Type personality → font tokens
- Is the display type **serif or sans**? **Condensed or wide**? **Geometric or
  humanist**? **Heavy or light**? Describe it, then find a Google Fonts face that
  matches that PERSONALITY — not the exact font (which may be proprietary). E.g.
  image uses a tight condensed athletic sans → 'Archivo Black' / 'Oswald'; image
  uses a warm high-contrast serif → 'Fraunces' (sparingly) / 'Newsreader'.
- Match the body face's feel too (clean neutral vs characterful).
- Apply the font-pairing rule from `token-contract.md`.

### 3. Shape language → shape tokens
- Are the corners **sharp/blocky** (small radius, technical/athletic/industrial)
  or **soft/rounded** (large radius, friendly/boutique)? → `rTile` / `rEl`.
- Square-ish product cards and hard edges → 6–10px. Pill-soft, generous → 18–24px.

### 4. Density & rhythm → layout tokens
- Is the reference **dense and packed** (lots per screen, editorial/retail energy)
  or **airy and spacious** (few elements, luxury/calm)? → `density`
  (compact/cozy/airy).
- Then read the grid SHAPE and map it to `gridStyle` (the PRIMARY grid axis — set
  this, not the legacy `gridCols`):
  - Uniform tidy grid, roomy → `grid-3`; standard → `grid-4`; packed/retail → `grid-5`.
  - One image dominates the grid, editorial magazine energy → `mosaic`.
  - Staggered/brick-bond, offset rows → `offset`.
  - A single horizontal filmstrip / lookbook / catwalk row → `runway`.
  Only fall back to `gridCols` (3 | 4) if the brief is genuinely just "how many
  columns" — `gridStyle` covers that plus the expressive shapes.

### 5. Mood → heroStyle
- Bold/graphic/branded, big type as the hero → `editorial`.
- Photographic, image-led, warm → `bento` (the default; carries a hero photo well).
- These are the only two heroStyles in the enum; anything else falls back to
  `bento` (see token-contract.md). If the image clearly needs a third treatment,
  either use bento/editorial or plan the hero-component work.

## Multiple images

If several images are given, treat them as a mood board: find the *common
thread* (they usually share a temperature, an energy, a type feel). Don't average
into mud — pick the strongest coherent direction and let the outliers inform
accent or a supporting choice.

## The trap to avoid

The failure mode is "the image had a hero with a photo on the left and text on
the right, so I'll rebuild that layout." No. The image's *layout* is not a token.
Extract that it felt "photographic, warm, spacious" and set
`heroStyle: bento`, a warm palette, `density: airy`. Our bento hero then
expresses that feel with the shop's own content. Layout stays ours; feel comes
from the image.

## When the image conflicts with the brief

If the words say "energetic/bold" but the image is calm and minimal, surface the
tension to the user in step 5 rather than guessing — show one direction leaning
to the image, one leaning to the words, and let them choose.
