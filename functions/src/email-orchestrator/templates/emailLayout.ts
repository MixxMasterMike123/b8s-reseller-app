// Shared email layout helpers — the ONE place the NORD-aligned, email-safe
// visual system lives. Every template renders through these so the whole
// transactional email family stays coherent. Rules of the road:
//   • Inline CSS only, table-friendly markup, no webfonts / external assets /
//     images — must survive Gmail, Outlook, Apple Mail.
//   • Per-shop identity comes in as `brandName` (never a hardcoded brand).
//
// Design tokens (NORD canvas + ink):
const T = {
  canvas: '#F7F5F2',      // page background
  card: '#ffffff',        // content card
  ink: '#1A1C1E',         // primary text + primary button
  muted: '#6B7280',       // secondary text / footer
  border: '#E5E7EB',      // hairlines
  panel: '#F7F5F2',       // code box / subtle panels
  font: "'Segoe UI', Arial, sans-serif",
  maxWidth: '600px',
} as const;

export const emailTokens = T;

/** Escape a value for safe interpolation into HTML text/attributes. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The outer shell: NORD canvas → centered white card → optional footer.
 * `bodyHtml` is the already-composed inner content (headings, paragraphs,
 * buttons, tables). `footerNote` overrides the default "skickades av …" line.
 */
export function renderEmailShell(opts: {
  brandName: string;
  bodyHtml: string;
  /** Extra footer HTML (e.g. a support link) appended after the brand line. */
  footerExtraHtml?: string;
  /** Override the whole footer note (defaults to "Detta meddelande skickades av {brandName}."). */
  footerNote?: string;
  /** Preheader text (hidden inbox preview). */
  preheader?: string;
}): string {
  const brand = esc(opts.brandName);
  const footerNote = opts.footerNote ?? `Detta meddelande skickades av ${brand}.`;
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${T.canvas};font-size:1px;line-height:1px;">${esc(opts.preheader)}</div>`
    : '';

  return `<div style="background-color:${T.canvas};margin:0;padding:24px 12px;font-family:${T.font};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:${T.maxWidth};margin:0 auto;">
          <tr>
            <td style="background-color:${T.card};border:1px solid ${T.border};border-radius:12px;padding:32px;">
              <div style="font-weight:700;font-size:20px;color:${T.ink};line-height:1.2;margin-bottom:24px;">${brand}</div>
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 4px 8px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${T.muted};">${footerNote}</p>
              ${opts.footerExtraHtml ?? ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`;
}

/** Section heading inside the card. */
export function renderHeading(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:${T.ink};line-height:1.3;">${text}</h1>`;
}

/** Body paragraph. Pass `muted:true` for secondary text. `html:true` to allow inline markup. */
export function renderParagraph(text: string, opts: { muted?: boolean; html?: boolean } = {}): string {
  const color = opts.muted ? T.muted : T.ink;
  const body = opts.html ? text : esc(text);
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${color};">${body}</p>`;
}

/** Primary pill CTA. NEVER a blue link — this is the one call-to-action style. */
export function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0;">
  <tr>
    <td style="border-radius:999px;background-color:${T.ink};">
      <a href="${esc(href)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;font-family:${T.font};">${label}</a>
    </td>
  </tr>
</table>`;
}

/** Centered code panel for reset/verification codes. */
export function renderCodeBox(code: string): string {
  return `<div style="background-color:${T.panel};border:1px solid ${T.border};border-radius:8px;padding:20px;margin:20px 0;text-align:center;font-family:'Courier New',monospace;font-size:24px;letter-spacing:4px;color:${T.ink};word-break:break-all;">${esc(code)}</div>`;
}

/**
 * A key/value list rendered as a clean hairline table. Values may be raw HTML
 * (already escaped by caller) when `rawHtml` is set.
 */
export function renderKeyValueRows(
  rows: Array<{ label: string; value: string }>,
  opts: { rawHtml?: boolean } = {}
): string {
  const body = rows
    .filter((r) => r && r.value !== undefined && r.value !== null && r.value !== '')
    .map(
      (r) => `<tr>
      <td style="padding:8px 0;font-size:14px;color:${T.muted};border-bottom:1px solid ${T.border};vertical-align:top;">${esc(r.label)}</td>
      <td style="padding:8px 0 8px 16px;font-size:14px;color:${T.ink};border-bottom:1px solid ${T.border};text-align:right;vertical-align:top;">${opts.rawHtml ? r.value : esc(r.value)}</td>
    </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 20px 0;">${body}</table>`;
}

/**
 * A subtle bordered panel to group content (e.g. credentials, links).
 * `title` is optional; `bodyHtml` is already-composed inner markup.
 */
export function renderPanel(bodyHtml: string, title?: string): string {
  const heading = title
    ? `<div style="font-size:14px;font-weight:600;color:${T.ink};margin-bottom:12px;">${title}</div>`
    : '';
  return `<div style="background-color:${T.panel};border:1px solid ${T.border};border-radius:8px;padding:20px;margin:0 0 20px 0;">${heading}${bodyHtml}</div>`;
}

/** A bullet list. Items may be raw HTML when `rawHtml` is set. */
export function renderList(items: string[], opts: { rawHtml?: boolean; muted?: boolean } = {}): string {
  const color = opts.muted ? T.muted : T.ink;
  const lis = items
    .map((it) => `<li style="margin-bottom:8px;line-height:1.6;">${opts.rawHtml ? it : esc(it)}</li>`)
    .join('');
  return `<ul style="margin:0 0 16px 0;padding-left:20px;font-size:15px;color:${color};">${lis}</ul>`;
}

/**
 * An order-line table: product name (+ optional meta line) and a right-aligned
 * amount, separated by hairlines. `rows[].meta` is raw HTML (pills etc.).
 */
export function renderOrderRows(
  rows: Array<{ name: string; meta?: string; qtyLine?: string; amount: string }>
): string {
  const body = rows
    .map(
      (r) => `<tr>
      <td style="padding:14px 0;border-bottom:1px solid ${T.border};vertical-align:top;">
        <div style="font-size:15px;font-weight:600;color:${T.ink};line-height:1.4;">${esc(r.name)}</div>
        ${r.meta ? `<div style="margin-top:4px;">${r.meta}</div>` : ''}
        ${r.qtyLine ? `<div style="margin-top:4px;font-size:13px;color:${T.muted};">${esc(r.qtyLine)}</div>` : ''}
      </td>
      <td style="padding:14px 0;border-bottom:1px solid ${T.border};text-align:right;vertical-align:top;font-size:15px;font-weight:600;color:${T.ink};white-space:nowrap;font-variant-numeric:tabular-nums;">${esc(r.amount)}</td>
    </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 20px 0;">${body}</table>`;
}

/**
 * Totals table (delsumma/frakt/rabatt/moms/totalt). Rows are {label, value,
 * emphasis?}. The final emphasised row gets a top rule and larger type.
 */
export function renderTotals(
  rows: Array<{ label: string; value: string; emphasis?: boolean; positive?: boolean }>
): string {
  const body = rows
    .map((r) => {
      if (r.emphasis) {
        return `<tr>
        <td style="padding:14px 0 0 0;border-top:2px solid ${T.border};font-size:17px;font-weight:700;color:${T.ink};">${esc(r.label)}</td>
        <td style="padding:14px 0 0 0;border-top:2px solid ${T.border};text-align:right;font-size:17px;font-weight:700;color:${T.ink};font-variant-numeric:tabular-nums;">${esc(r.value)}</td>
      </tr>`;
      }
      const color = r.positive ? '#059669' : T.muted;
      return `<tr>
        <td style="padding:5px 0;font-size:14px;color:${color};">${esc(r.label)}</td>
        <td style="padding:5px 0;text-align:right;font-size:14px;color:${color};font-variant-numeric:tabular-nums;">${esc(r.value)}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 20px 0;">${body}</table>`;
}

/**
 * A plain (non-CTA) inline text link, used inside paragraphs/footers.
 * Muted ink, underlined — deliberately NOT the blue primary-action style.
 */
export function renderTextLink(href: string, label: string): string {
  return `<a href="${esc(href)}" style="color:${T.ink};text-decoration:underline;">${label}</a>`;
}

/** Footer support line: "Behöver du hjälp? {link}" / EN equivalent. */
export function renderFooterSupport(url: string, lang: string = 'sv-SE'): string {
  const en = lang.startsWith('en');
  const label = en ? 'Need help?' : 'Behöver du hjälp?';
  const display = url.replace(/^https?:\/\//, '');
  return `<p style="margin:6px 0 0 0;font-size:12px;line-height:1.6;color:${T.muted};">${label} <a href="${esc(url)}" style="color:${T.muted};text-decoration:underline;">${esc(display)}</a></p>`;
}
