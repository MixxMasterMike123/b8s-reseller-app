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
    gridCols:  4,           // desktop product-grid columns.  ENUM: 3 | 4
    density:   'cozy',      // section rhythm.  ENUM: 'compact' | 'cozy' | 'airy'
    heroStyle: 'bento'      // homepage hero.   ENUM: 'bento' | 'full' | 'split' | 'editorial'
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
layout.gridCols   4
layout.density    cozy
layout.heroStyle  bento
```

## heroStyle notes

- `bento` — the default NORD signature hero (image/accent-gradient bento tile +
  supporting bestseller/trust tiles). Every template gets this unless it sets
  another.
- `editorial` — implemented (the Sport template uses it): light surface card,
  big blocky uppercase headline, an OPTIONAL faint graphic mark (only shown when
  the shop sets `heroMark`), accent CTA. Good for bold/branded looks.
- `full`, `split` — reserved in the enum but **not yet implemented** in the hero
  component. ⚠️ TRAP: `TOKEN_ENUMS` still lists them, so `resolveTheme` accepts
  `heroStyle:'split'` as "valid" and the enum-validation will NOT catch it — but
  the hero component has no branch for it, so it silently renders `bento`. So a
  template that sets `full`/`split` builds green and looks broken-ish (bento
  where you expected something else). If a direction needs one, you MUST first
  implement its branch in `src/pages/shop/PublicStorefront.jsx` (SKILL.md step 6);
  otherwise use `bento` or `editorial`, the two that actually render.

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
