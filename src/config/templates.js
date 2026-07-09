/**
 * Storefront TEMPLATES — curated, named NORD themes.
 *
 * A template is a PARTIAL of NORD_TOKENS (src/config/nordTokens.js): it sets a
 * subset of the token contract, everything it omits falls back to the NORD
 * default. Applying a template is exactly `resolveTheme(template.tokens)`.
 *
 * These are the "pick a template & go" presets — built BY US (later, generated
 * by the design pipeline and dropped in here). A shop selects one; its `tokens`
 * are stored on the shop's config `theme` field and applied at runtime by
 * StoreSettingsContext. The per-shop `accent` still overrides the template's
 * default accent, so two shops on the same template look distinct by color.
 *
 * Adding a template = add an entry here. No component or CSS changes needed for
 * a pure-token template; a template that uses a new `layout.heroStyle` needs
 * that hero variant implemented in the storefront hero (see PublicStorefront).
 *
 * `id` 'nord' is the implicit default (empty token override = pure NORD); it is
 * listed here for the admin picker but carries no overrides.
 */

/** The default NORD look — no overrides. Selecting it = pure NORD. */
export const NORD_TEMPLATE = {
  id: 'nord',
  name: 'NORD',
  tagline: 'Varm, redaktionell, tidlös — standardtemat.',
  // Thumbnail for the admin template picker (public/ asset, 640×400 @2x).
  thumb: '/template-thumbs/nord.png',
  // Empty: resolveTheme({}) yields the NORD defaults.
  tokens: {},
};

/**
 * SPORT — "Gameday" template for Nordic sports clubs & teams (football,
 * hockey, floorball, handball, running, gym). Blocky athletic type, cool
 * high-contrast canvas, one committed energetic accent, denser grid, and the
 * `editorial` hero (giant faint graphic mark + accent-underlined headline word
 * + a stat/trust row). Deliberately sport-NEUTRAL: no sport-specific copy or
 * motifs live in the template — copy comes from each shop's config + catalog.
 *
 * Derived from design direction "C · Kit" (see
 * src/dev/sport-template-directions/C-kit.html), re-accented to energetic red
 * per the general-sports brief.
 */
export const SPORT_TEMPLATE = {
  id: 'sport',
  name: 'Sport',
  tagline: 'Snabb, energisk, lagkänsla — för klubbar och föreningar.',
  thumb: '/template-thumbs/sport.png',
  tokens: {
    colors: {
      accent: '#E8112D',    // energetic team red — AA as button bg w/ white text
      accentInk: '#FFFFFF',
      // accentSoft omitted → resolveTheme derives it from accent + surface
      canvas: '#EEF0F3',    // cool light (chroma≈0, jersey off-white — NOT warm cream)
      surface: '#FFFFFF',
      ink: '#0D1013',       // near-black, cool
      inkMuted: '#4A5058',
      inkFaint: '#8A9099',
      line: '#D7DBE0',
    },
    fonts: {
      // Archivo Black = blocky athletic display; Archivo = clean sturdy body.
      // Loaded on demand via ensureTemplateFonts() so default NORD shops don't
      // pay for fonts they never use.
      display: "'Archivo Black', ui-sans-serif, system-ui, sans-serif",
      body: "'Archivo', -apple-system, ui-sans-serif, system-ui, sans-serif",
    },
    shape: {
      rTile: '8px',   // blocky — arena signage, not boutique
      rEl: '6px',
    },
    motion: {
      ease: 'cubic-bezier(0.16, 0.84, 0.44, 1)',   // fast, momentum, no bounce
    },
    layout: {
      gridCols: 4,
      density: 'compact',
      heroStyle: 'editorial',
      cardStyle: 'bordered',   // blocky 2px-border cards — athletic, not soft/floaty
    },
  },
  /**
   * Google Fonts families this template needs, in the exact form appended to
   * the fonts.googleapis.com css2 query. ensureTemplateFonts() injects a <link>
   * for these when the template is active. NORD's own fonts (Familjen Grotesk,
   * Instrument Sans) are always loaded in index.html and never listed here.
   */
  fonts: ['Archivo:ital,wght@0,400;0,500;0,600;0,700;1,600', 'Archivo+Black'],
};

/**
 * MOLTEN — "after-hours" template for streetwear / drop brands (hoodies, tees,
 * caps, limited releases). Dark and loud: a near-black cool canvas, one molten-
 * red accent reserved for actions, tall industrial condensed display (Oswald)
 * over a quiet neutral body (Inter), soft-ish blocky tiles, an AIRY rhythm that
 * lets the dark breathe, and `overlay` product cards — the image fills the card
 * and name/price/CTA sit in a scrim over it (image-forward, magazine). Reads
 * like a Berlin after-hours merch table under red exit-sign glow. Deliberately
 * brand-NEUTRAL: no streetwear-specific copy lives in the template; it comes
 * from each shop's config + catalog.
 *
 * Derived from design direction "C · Molten" (see
 * src/dev/template-previews/streetwear-C.html).
 */
export const MOLTEN_TEMPLATE = {
  id: 'molten',
  name: 'Molten',
  tagline: 'Mörk, hög och kompromisslös — för streetwear och släpp.',
  thumb: '/template-thumbs/molten.png',
  tokens: {
    colors: {
      accent: '#E01F26',     // molten red — AA (4.78:1) as button bg w/ white text
      accentInk: '#FFFFFF',
      // accentSoft omitted → resolveTheme derives it from accent + surface
      canvas: '#0B0B0D',     // near-black, cool/neutral (NOT warm charcoal, NOT navy)
      surface: '#17171B',    // raised module — a hair lighter than canvas
      ink: '#F3F3F5',        // tier-1 text: near-white on dark
      inkMuted: '#98999F',   // tier-2: mid gray, AA on both canvas & surface
      inkFaint: '#5E5F66',   // tier-3: eyebrows/footer
      line: '#FFFFFF12',     // hairline: white at ~7% for dark surfaces
    },
    fonts: {
      // Oswald = tall industrial condensed display; Inter = quiet neutral body
      // BEHIND the distinctive display (sanctioned use). Loaded on demand via
      // ensureTemplateFonts() so default NORD shops don't pay for them.
      display: "'Oswald', ui-sans-serif, system-ui, sans-serif",
      body: "'Inter', -apple-system, ui-sans-serif, system-ui, sans-serif",
    },
    shape: {
      rTile: '10px',  // softer than brutalist — premium-dark, not arena-blocky
      rEl: '8px',
    },
    motion: {
      ease: 'cubic-bezier(0.16, 0.84, 0.44, 1)',  // fast, momentum, no bounce
    },
    layout: {
      gridCols: 4,
      density: 'airy',        // roomy rhythm lets the dark canvas breathe
      heroStyle: 'bento',     // dark image tile + red exit-sign glow scrim
      cardStyle: 'overlay',   // image fills the card; name/price/CTA in a scrim
    },
  },
  /**
   * Google Fonts families this template needs, in the exact css2 `family=` form.
   * ensureTemplateFonts() injects a <link> for these when the template is active.
   * NORD's own fonts are always loaded in index.html and never listed here.
   */
  fonts: ['Oswald:wght@500;600;700', 'Inter:wght@400;500;600'],
};

/** All templates, in picker order. NORD first (the default). */
export const TEMPLATES = [NORD_TEMPLATE, SPORT_TEMPLATE, MOLTEN_TEMPLATE];

/** Look up a template by id; falls back to NORD for unknown/empty ids. */
export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || NORD_TEMPLATE;
}
