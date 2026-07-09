/**
 * NORD design tokens — the canonical, overridable token contract for the
 * storefront (see DESIGN.md). This file is the SINGLE SOURCE OF TRUTH for
 * "what a template is allowed to change."
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Why this exists
 * ─────────────────────────────────────────────────────────────────────────
 * The storefront reads every visual value through Tailwind v4 utilities
 * (`bg-accent`, `text-ink`, `rounded-tile`, `font-display`, …) which compile
 * to `var(--color-accent)`, `var(--radius-tile)`, … resolved AT USE-SITE.
 * So overriding those CSS variables on <html> at runtime re-skins the WHOLE
 * storefront with ZERO component changes. `applyThemeTokens()` below does
 * exactly that; StoreSettingsContext calls it from the active shop's config.
 *
 * A "template" (built by us, later generated via the design pipeline) is just
 * a PARTIAL of `NORD_TOKENS` — any key it omits falls back to the NORD default,
 * so a template can never produce an undefined/broken value. `NORD_TOKENS` IS
 * the guardrail: the generator may pick values, but only for these keys, and
 * (for structural keys) only from the allowed sets documented here.
 *
 * SCOPE: storefront only. The admin console has its OWN token set
 * (--color-admin-*) that is deliberately never themed (see index.css §admin).
 * Nothing here touches pricing, checkout logic, or tenant isolation.
 */

/**
 * The default NORD theme. Values are byte-identical to the `@theme` block in
 * src/index.css — applying this object changes nothing, which is the point:
 * every existing shop keeps its exact look until a template overrides keys.
 *
 * Grouped by concern. Each leaf maps to exactly one CSS custom property via
 * TOKEN_CSS_VAR below.
 */
export const NORD_TOKENS = {
  // ── Color roles ────────────────────────────────────────────────────────
  // `accent` is the historical per-shop identity token (WCAG-AA gated as a
  // button bg with white text — see evaluateAccentContrast). The rest were
  // documented in DESIGN.md §2 but only partially present in CSS before; they
  // are first-class template controls now.
  colors: {
    accent: '#0E5E63',      // actions & live signals ONLY (never decoration)
    accentInk: '#FFFFFF',   // text/icon color ON an accent fill
    accentSoft: '',         // soft accent wash (chips, rings). '' → derived at
                            //   apply-time as color-mix(accent 8%, surface)
    canvas: '#F3F1EC',      // warm greige page background
    surface: '#FFFFFF',     // module/card background
    ink: '#1A1C1E',         // tier-1 text (titles, prices)
    inkMuted: '#71757C',    // tier-2 text (descriptions, labels)
    inkFaint: '#A8ABB0',    // tier-3 text (eyebrows, footer)
    line: '#1A1C1E0F',      // rare hairlines (inputs, swatch borders)
  },

  // ── Typography ─────────────────────────────────────────────────────────
  // Font *stacks*. Templates swap the pairing; the actual webfont must be
  // loaded (index.html link or a per-template <link>). Keep a real system
  // fallback first-in-stack after the branded face so a missing font degrades.
  fonts: {
    display: "'Familjen Grotesk', ui-sans-serif, system-ui, sans-serif",
    body: "'Instrument Sans', -apple-system, ui-sans-serif, system-ui, sans-serif",
  },

  // ── Shape ──────────────────────────────────────────────────────────────
  shape: {
    rTile: '22px',   // modules, cards
    rEl: '14px',     // inputs, inner chips  (buttons/pills stay 999px in CSS)
  },

  // ── Motion ─────────────────────────────────────────────────────────────
  motion: {
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },

  // ── Structure ──────────────────────────────────────────────────────────
  // The knobs that make templates look genuinely DIFFERENT rather than merely
  // recolored. Constrained to enum-like sets so a generated template can only
  // pick sane values. These drive utilities/CSS added in index.css.
  layout: {
    // Product grid columns at desktop (LEGACY axis, back-compat). Storefront
    // grids read `--nord-grid-cols`; mobile/tablet steps are fixed in CSS.
    // Superseded by `gridStyle` below — kept so pre-gridStyle templates/shops
    // still resolve. When a template/shop sets only gridCols, resolveTheme maps
    // it to the matching gridStyle ('grid-3'/'grid-4'); gridStyle wins if both.
    gridCols: 4,                // 3 | 4
    // Product GRID layout — the highest-impact structural differentiator after
    // cardStyle. Not just a column count: mosaic/offset/runway change the grid's
    // SHAPE so two templates stop looking like the same page recolored. Each
    // value maps to a complete, pre-authored layout recipe (nordGridLayout) —
    // it can't be a free integer because Tailwind purges dynamically-built
    // classes. 'grid-4' equals the legacy 4-col default (no-op).
    //   'grid-3'/'grid-4'/'grid-5' — uniform N-col grids (3/4/5 at desktop).
    //   'mosaic'  — mixed cell spans; a hero product dominates. Editorial.
    //   'offset'  — brick-bond; alternating columns nudged down. Subtle-distinct.
    //   'runway'  — one horizontal-scroll row, no wrap. Lookbook/catwalk.
    gridStyle: 'grid-4',        // 'grid-3'|'grid-4'|'grid-5'|'mosaic'|'offset'|'runway'
    // Global spacing rhythm. Scales the section padding/gap custom props.
    density: 'cozy',            // 'compact' | 'cozy' | 'airy'
    // Homepage hero treatment. 'bento' is the signature NORD layout; the
    // others are template variants (implemented incrementally on the hero).
    heroStyle: 'bento',         // 'bento' | 'full' | 'split' | 'editorial'
    // Product-CARD design. This is what makes two templates genuinely differ —
    // not just color/font but the card shape itself. 'elevated' is the NORD
    // default (white module + soft shadow + hover lift). Others:
    //   'flat'     — hairline border, no shadow; clean/editorial.
    //   'bordered' — strong visible border, no shadow; blocky/athletic.
    //   'overlay'  — name/price overlaid on the image; image-forward/magazine.
    // NordProductCard reads this and renders the matching variant.
    cardStyle: 'elevated',      // 'elevated' | 'flat' | 'bordered' | 'overlay'
  },
};

/**
 * Allowed values for the structural (enum) tokens. The design pipeline MUST
 * validate a generated template against these before it is applied/persisted —
 * this is what stops "gridCols: 7" or a typo hero style from reaching render.
 * Color/font/shape/motion are free-form strings (still validated for format
 * elsewhere, e.g. accent contrast).
 */
export const TOKEN_ENUMS = {
  'layout.gridCols': [3, 4],
  'layout.gridStyle': ['grid-3', 'grid-4', 'grid-5', 'mosaic', 'offset', 'runway'],
  'layout.density': ['compact', 'cozy', 'airy'],
  'layout.heroStyle': ['bento', 'full', 'split', 'editorial'],
  'layout.cardStyle': ['elevated', 'flat', 'bordered', 'overlay'],
};

/**
 * Maps every leaf token (dot-path) → the CSS custom property it sets on <html>.
 * Structural tokens map to `--nord-*` vars that CSS/utilities consume; color/
 * shape/type map to the same `--color-*`/`--radius-*`/`--font-*` vars the
 * Tailwind theme already generates utilities from, so overriding them re-skins
 * every existing utility usage.
 */
export const TOKEN_CSS_VAR = {
  'colors.accent': '--color-accent',
  'colors.accentInk': '--color-accent-ink',
  'colors.accentSoft': '--color-accent-soft',
  'colors.canvas': '--color-canvas',
  'colors.surface': '--color-surface',
  'colors.ink': '--color-ink',
  'colors.inkMuted': '--color-ink-muted',
  'colors.inkFaint': '--color-ink-faint',
  'colors.line': '--color-line',
  'fonts.display': '--font-display',
  'fonts.body': '--font-body',
  'shape.rTile': '--radius-tile',
  'shape.rEl': '--radius-el',
  'motion.ease': '--ease-nord',
  // gridCols is NOT a CSS var — it maps to a static Tailwind class via
  // nordGridClass() (a custom @utility lost the cascade to sm:grid-cols-2).
  // density + heroStyle + cardStyle are also not single CSS vars: density
  // expands to several spacing vars (DENSITY_VARS); heroStyle/cardStyle switch
  // a component branch. All handled specially in resolveTheme.
};

/**
 * Grid LAYOUT descriptor for a template's `gridStyle`. Returns
 *   { container: '<complete class string>', cellClass: (index) => '<class>' }
 * where `container` is the grid wrapper class and `cellClass(i)` gives the
 * per-card span/size class for card `i` (empty string for uniform grids).
 *
 * Every class is a COMPLETE literal string (no dynamic `lg:grid-cols-${n}`
 * construction) so Tailwind's scanner keeps the utilities in the build — the
 * reason gridStyle is an enum of recipes, not a free integer. Mobile (1) +
 * tablet (2) steps are fixed for readability; the desktop layout varies.
 *
 * The non-uniform styles (mosaic/offset/runway) lean on a few static utilities
 * defined in index.css (§nord-grid) so they survive the build too.
 *
 * Falls back to the uniform 4-col grid for anything unexpected.
 */
export function nordGridLayout(gridStyle) {
  const NONE = () => '';
  switch (gridStyle) {
    case 'grid-3':
      return { container: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch', cellClass: NONE };
    case 'grid-5':
      return { container: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-stretch', cellClass: NONE };
    case 'mosaic':
      // 4-col base; the first card spans 2 columns (a wide "hero product"), the
      // rest are single. NO fixed row height — cards keep their own 3:4 aspect,
      // so the wide card is simply proportionally larger. Reads as an editorial
      // mosaic without fighting the overlay card's aspect ratio. `items-start`
      // so a taller wide card doesn't stretch its row-mates.
      return {
        container: 'grid grid-cols-2 lg:grid-cols-4 gap-4 items-start',
        cellClass: (i) => (i === 0 ? 'col-span-2' : ''),
      };
    case 'offset':
      // Brick bond: alternating desktop columns nudged down half a cell via a
      // static utility. Uniform cells, staggered rhythm.
      return {
        container: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch nord-grid-offset',
        cellClass: NONE,
      };
    case 'runway':
      // One horizontal-scroll row, no wrap — a lookbook/catwalk. Cells get a
      // fixed flex-basis; the container scrolls with snap.
      return {
        container: 'flex gap-4 overflow-x-auto pb-3 nord-grid-runway',
        cellClass: () => 'shrink-0 basis-[75%] sm:basis-[45%] lg:basis-[23%] snap-start',
      };
    case 'grid-4':
    default:
      return { container: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch', cellClass: NONE };
  }
}

/**
 * Back-compat shim: old callers passed a numeric gridCols and got a container
 * class string. Maps the number to the equivalent gridStyle and returns just
 * the container class. New code should use nordGridLayout(gridStyle).
 */
export function nordGridClass(gridCols) {
  return nordGridLayout(gridCols === 3 ? 'grid-3' : 'grid-4').container;
}

/**
 * Density → concrete spacing values. Applied as CSS vars the storefront
 * sections reference for their outer padding + inter-module gap. 'cozy' equals
 * the current hardcoded NORD rhythm, so the default is a no-op.
 */
export const DENSITY_VARS = {
  compact: { '--nord-section-y': '3rem', '--nord-gap': '0.75rem' },
  cozy: { '--nord-section-y': '4.5rem', '--nord-gap': '1rem' },
  airy: { '--nord-section-y': '6.5rem', '--nord-gap': '1.5rem' },
};

/** Read a dot-path (e.g. 'colors.accent') out of a nested token object. */
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * Ensure a template's webfonts are loaded, on demand. Default NORD shops load
 * their fonts (Familjen Grotesk, Instrument Sans) statically in index.html and
 * never call this; a template that swaps the font stack passes its Google Fonts
 * families here so a <link> is injected once, keyed so switching templates or
 * re-rendering never duplicates it.
 *
 * `families` is a string[] of css2 `family=` values (e.g.
 * ['Archivo:wght@400;700', 'Archivo+Black']). No-op on the server / when empty.
 */
export function ensureTemplateFonts(families) {
  if (typeof document === 'undefined') return;
  if (!Array.isArray(families) || families.length === 0) return;
  const id = 'nord-template-fonts';
  const href =
    'https://fonts.googleapis.com/css2?' +
    families.map((f) => `family=${f}`).join('&') +
    '&display=swap';
  let link = document.getElementById(id);
  if (link) {
    // Same template active again → nothing to do; different template → repoint.
    if (link.getAttribute('href') === href) return;
    link.setAttribute('href', href);
    return;
  }
  link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Merge a (possibly partial) template over the NORD defaults into a full,
 * flat { cssVar → value } map plus the special density/hero handling.
 *
 * `template` shape is a partial of NORD_TOKENS, e.g.
 *   { colors: { accent: '#2B50E2' }, layout: { gridCols: 3, heroStyle: 'split' } }
 * Unknown/omitted keys fall back to NORD defaults. Invalid enum values are
 * dropped (fall back to default) rather than applied — defensive against a
 * malformed generated template.
 *
 * Returns { vars: {'--x': 'v', …}, heroStyle: 'bento' } — heroStyle is returned
 * separately because it is consumed by the hero component, not a CSS var.
 */
export function resolveTheme(template) {
  const t = template && typeof template === 'object' ? template : {};
  const merged = {
    colors: { ...NORD_TOKENS.colors, ...(t.colors || {}) },
    fonts: { ...NORD_TOKENS.fonts, ...(t.fonts || {}) },
    shape: { ...NORD_TOKENS.shape, ...(t.shape || {}) },
    motion: { ...NORD_TOKENS.motion, ...(t.motion || {}) },
    layout: { ...NORD_TOKENS.layout, ...(t.layout || {}) },
  };

  const vars = {};
  for (const [path, cssVar] of Object.entries(TOKEN_CSS_VAR)) {
    let value = getPath(merged, path);
    if (value === undefined || value === null || value === '') continue;

    // Validate enum-constrained structural tokens; drop invalid → default.
    const allowed = TOKEN_ENUMS[path];
    if (allowed && !allowed.includes(value)) {
      value = getPath(NORD_TOKENS, path);
    }
    vars[cssVar] = String(value);
  }

  // accentSoft: if a template didn't set it explicitly, derive it from the
  // resolved accent + surface so a custom accent always gets a matching wash.
  if (!vars['--color-accent-soft']) {
    vars['--color-accent-soft'] =
      `color-mix(in srgb, ${merged.colors.accent} 8%, ${merged.colors.surface})`;
  }

  // density → spacing vars (validated).
  const density = TOKEN_ENUMS['layout.density'].includes(merged.layout.density)
    ? merged.layout.density
    : NORD_TOKENS.layout.density;
  Object.assign(vars, DENSITY_VARS[density]);

  const heroStyle = TOKEN_ENUMS['layout.heroStyle'].includes(merged.layout.heroStyle)
    ? merged.layout.heroStyle
    : NORD_TOKENS.layout.heroStyle;

  const cardStyle = TOKEN_ENUMS['layout.cardStyle'].includes(merged.layout.cardStyle)
    ? merged.layout.cardStyle
    : NORD_TOKENS.layout.cardStyle;

  const gridCols = TOKEN_ENUMS['layout.gridCols'].includes(merged.layout.gridCols)
    ? merged.layout.gridCols
    : NORD_TOKENS.layout.gridCols;

  // gridStyle resolution with legacy gridCols back-compat:
  //  - if the template/shop set an explicit, valid gridStyle → it wins.
  //  - else if it set only a legacy gridCols (3) → map to the matching style.
  //  - else → NORD default ('grid-4').
  // `rawLayout` is the un-merged input so we can tell "explicitly set" from
  // "inherited NORD default" (both would look equal after the merge).
  const rawLayout = (t.layout && typeof t.layout === 'object') ? t.layout : {};
  let gridStyle;
  if (TOKEN_ENUMS['layout.gridStyle'].includes(rawLayout.gridStyle)) {
    gridStyle = rawLayout.gridStyle;
  } else if (rawLayout.gridStyle === undefined && rawLayout.gridCols === 3) {
    gridStyle = 'grid-3';
  } else {
    gridStyle = NORD_TOKENS.layout.gridStyle; // 'grid-4'
  }

  return { vars, heroStyle, cardStyle, gridCols, gridStyle };
}
