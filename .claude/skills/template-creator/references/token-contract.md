# NORD token contract — what a template may set

This is the exhaustive list of tokens a template can override. The source of
truth is `src/config/nordTokens.js` (`NORD_TOKENS`, `TOKEN_ENUMS`,
`TOKEN_CSS_VAR`). **Read that file too** — if it has diverged from this doc,
the code wins. A template is a *partial* of this shape: include only keys that
differ from the NORD defaults shown; omitted keys inherit the default.

A value you set that isn't in this contract, or a structural value outside its
enum, is **dropped at runtime** (resolveTheme falls back to the NORD default).
So there is no point setting anything not listed here.

## The shape

```js
{
  colors: {
    accent:     '#RRGGBB',  // actions & live signals ONLY (never decoration).
                            //   MUST pass WCAG AA as a button bg with white text.
    accentInk:  '#RRGGBB',  // text/icon color ON an accent fill (usually #FFFFFF)
    accentSoft: '',         // soft wash (chips/rings). Leave '' to auto-derive
                            //   as color-mix(accent 8%, surface) at runtime.
    canvas:     '#RRGGBB',  // page background
    surface:    '#RRGGBB',  // card / module background
    ink:        '#RRGGBB',  // tier-1 text (titles, prices)
    inkMuted:   '#RRGGBB',  // tier-2 text (descriptions, labels)
    inkFaint:   '#RRGGBB',  // tier-3 text (eyebrows, footer)
    line:       '#RRGGBBAA' // hairlines (inputs, swatch borders). 8-digit hex ok.
  },
  fonts: {
    // Font STACKS. The branded face first, then a real system fallback so a
    // missing webfont degrades gracefully. If you use a non-default face you
    // MUST also list it in the entry's `fonts` array (Google Fonts loads it).
    display: "'Face Name', ui-sans-serif, system-ui, sans-serif",
    body:    "'Face Name', -apple-system, ui-sans-serif, system-ui, sans-serif"
  },
  shape: {
    rTile: '22px',  // modules & cards. Smaller = blockier/technical; larger = soft.
    rEl:   '14px'   // inputs & inner chips. (Buttons/pills stay 999px in CSS.)
  },
  motion: {
    ease: 'cubic-bezier(...)'  // transition easing. ease-OUT curves only; no bounce.
  },
  layout: {
    gridStyle: 'grid-4',    // PRODUCT-GRID layout — the PRIMARY grid axis.
                            //   ENUM: 'grid-3'|'grid-4'|'grid-5'|'mosaic'|'offset'|'runway'
    gridCols:  4,           // LEGACY alias for column count. ENUM: 3 | 4.
                            //   Superseded by gridStyle; kept for back-compat only.
    density:   'cozy',      // section rhythm.  ENUM: 'compact' | 'cozy' | 'airy'
    heroStyle: 'bento',     // homepage hero.   ENUM: 'bento' | 'editorial'
    cardStyle: 'elevated'   // PRODUCT-CARD design. ENUM: 'elevated' | 'flat' | 'bordered' | 'overlay'
  }
}
```

## The NORD defaults (what you're varying from)

```
colors.accent     #0E5E63   (teal)
colors.accentInk  #FFFFFF
colors.canvas     #F3F1EC   (warm greige)
colors.surface    #FFFFFF
colors.ink        #1A1C1E
colors.inkMuted   #71757C
colors.inkFaint   #A8ABB0
colors.line       #1A1C1E0F
fonts.display     'Familjen Grotesk', ...
fonts.body        'Instrument Sans', ...
shape.rTile       22px
shape.rEl         14px
motion.ease       cubic-bezier(0.22, 1, 0.36, 1)
layout.gridStyle  grid-4
layout.gridCols   4          (legacy alias — grid-4 equivalent)
layout.density    cozy
layout.heroStyle  bento
layout.cardStyle  elevated
```

## cardStyle notes (this is what makes templates actually differ)

All four are IMPLEMENTED in `NordProductCard` and render distinctly — the card
is the most-repeated element on the storefront, so its design does more than
anything else to make two templates feel different. Vary it deliberately:

- `elevated` — NORD default: surface module, soft shadow, hover lift, square
  image, text below. Warm/premium/calm.
- `flat` — hairline border, no shadow, taller 4:5 image, tighter padding.
  Clean/editorial/minimal.
- `bordered` — strong 2px ink border, small radius, no shadow. Blocky/athletic/
  brutalist (the Sport template uses this).
- `overlay` — image fills the whole card; name + price + CTA sit in a dark scrim
  over the image, no separate text block. Image-forward/magazine/fashion. Best
  when shops will have strong product photography.

Pick the cardStyle that matches the brief's register, and make sure it's NOT the
same as an existing template's unless the whole look genuinely calls for it.

## gridStyle notes (the PRIMARY grid axis — use this, not gridCols)

`layout.gridStyle` is the real product-grid lever and the highest-impact
STRUCTURAL choice after cardStyle. It's not just a column count — the non-uniform
values change the grid's SHAPE, which is what stops two templates from reading as
the same page recolored. Each value maps to a pre-authored layout recipe
(`nordGridLayout` in nordTokens.js); it can't be a free integer because Tailwind
purges dynamically-built classes. ENUM: `grid-3 | grid-4 | grid-5 | mosaic |
offset | runway`.

- `grid-3` — uniform 3-col at desktop. Roomy, boutique/premium.
- `grid-4` — uniform 4-col. The NORD default (no-op).
- `grid-5` — uniform 5-col. Dense/retail; lots of SKUs per screen.
- `mosaic` — mixed cell spans; the first card spans 2 cols (a "hero product").
  Editorial. Pairs well with `overlay` cards.
- `offset` — brick-bond; alternating desktop columns nudged down half a cell.
  Uniform cells, staggered rhythm — subtle-distinct.
- `runway` — one horizontal-scroll row, no wrap (a lookbook/catwalk). Fashion/drop.

`layout.gridCols` (3 | 4) is a **legacy alias** kept only for back-compat: a
template that sets just `gridCols: 3` is mapped to `grid-3` at runtime, and
`gridStyle` wins if both are present. **Prefer setting `gridStyle` directly** — it
covers everything gridCols did plus the four expressive shapes. Vary it
deliberately per template; leaving it at `grid-4` for every template wastes the
strongest structural lever after cardStyle.

## heroStyle notes

- `bento` — the default NORD signature hero (image/accent-gradient bento tile +
  supporting bestseller/trust tiles). Every template gets this unless it sets
  another.
- `editorial` — implemented (the Sport template uses it): light surface card,
  big blocky uppercase headline, an OPTIONAL faint graphic mark (only shown when
  the shop sets `heroMark`), accent CTA. Good for bold/branded looks.

`bento` and `editorial` are **the only two values in the enum** — the older
`full`/`split` names were trimmed out of `TOKEN_ENUMS['layout.heroStyle']`, so
they no longer pass validation. If you set `heroStyle:'split'` now, `resolveTheme`
sees it's not in the enum and **falls back to `bento`** (the enum check catches it
— no silent look-alike bug, just a bento hero where you may have wanted something
else). So there are exactly two heroStyles you can pick from. If a direction truly
needs a third hero treatment, that's the one sanctioned component change: implement
its branch in `src/pages/shop/PublicStorefront.jsx` AND add its name to
`TOKEN_ENUMS['layout.heroStyle']` in nordTokens.js (SKILL.md step 6) — until both
are done, the value is dropped back to bento.

## Canvas temperature rule (the #1 slop check — make it numeric)

The warm cream/beige/sand canvas is THE saturated 2026 AI default, and canvas
temperature is the single thing that most often makes a storefront read as
"AI made this." Accent has a contrast helper; canvas has had none — so authors
eyeball it and drift warm. Don't. Make it checkable:

- Convert your chosen `canvas` to OKLCH (any converter, or reason from the hex).
  Keep **chroma ≤ ~0.02** unless the brief *explicitly* asks for warmth. That
  band covers true off-whites and faintly-tinted neutrals; above it you're in
  cream/sand territory.
- NORD's own canvas `#F3F1EC` sits at the **warm edge** of acceptable (~0.012
  chroma, hue ~90). Treat it as the ceiling, not a target. A new template should
  usually go *cooler/more neutral* than NORD, not warmer.
- If you tint the canvas, tint toward the **brand's own hue** (a florist-green
  canvas leans green, not "warm because flowers feel warm"). Default-warming is
  the monoculture move.
- Token names are a tell too: if you're reaching for `--cream`/`--sand`/`--linen`
  in your head, stop and pick a cooler neutral or a real brand-hued tint.

If the brief genuinely wants warmth (a bakery, a Tuscan deli), warmth is fine —
but carry it in the **accent + type + imagery**, not by defaulting the whole
canvas to cream. State explicitly when you're intentionally going warm and why.

## Contrast rule (do not skip)

`colors.accent` is used as a solid button background with white (`accentInk`)
text. It MUST pass WCAG AA (contrast ≥ 4.5:1 with #FFFFFF, or ≥ 3:1 for large
text). The project has `src/utils/colorContrast.js` (`evaluateAccentContrast`)
— use it to check the accent. A pretty accent that fails contrast is not usable;
pick a deeper shade.

Body text must also clear AA, and this is a SEPARATE check the accent helper does
NOT do (`evaluateAccentContrast` only tests white-on-accent). You must verify
`inkMuted` against BOTH `canvas` and `surface` yourself (WCAG ≥ 4.5:1 for body).
Light-gray-muted-text on a tinted near-white is the single most common
readability failure — when in doubt, darken `inkMuted` toward `ink`. There is no
bundled helper for this pair; compute the ratio directly (standard WCAG relative-
luminance formula) or reason conservatively and keep muted text clearly darker
than a mid gray.

## The `line` hairline: which form to use

`colors.line` can be either an **alpha-on-ink** hex (NORD: `#1A1C1E0F` — ink at
~6% opacity) or an **opaque light gray** (Sport: `#D7DBE0`). Prefer the alpha-on-
ink form (`#<your ink>0F` to `#<ink>14`) so the hairline tints with whatever
surface it sits on and stays coherent with the palette. Use an opaque gray only
when you deliberately want a fixed hairline color independent of the surface.

## Font pairing rule

Don't pair two fonts that are similar-but-not-identical (two geometric sans, two
humanist sans) — it reads as a mistake. Pair on a contrast axis (serif + sans,
condensed-display + neutral-body) or use one family across weights. And avoid
the overused faces (Inter, Roboto, Geist, Plus Jakarta, Space Grotesk as the
DISTINCTIVE face) — they're fine as a quiet body behind a characterful display,
but as the display face they signal "AI default." The bundled slop detector
flags these.
