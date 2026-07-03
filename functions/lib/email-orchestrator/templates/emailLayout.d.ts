export declare const emailTokens: {
    readonly canvas: "#F7F5F2";
    readonly card: "#ffffff";
    readonly ink: "#1A1C1E";
    readonly muted: "#6B7280";
    readonly border: "#E5E7EB";
    readonly panel: "#F7F5F2";
    readonly font: "'Segoe UI', Arial, sans-serif";
    readonly maxWidth: "600px";
};
/** Escape a value for safe interpolation into HTML text/attributes. */
export declare function esc(value: unknown): string;
/**
 * The outer shell: NORD canvas → centered white card → optional footer.
 * `bodyHtml` is the already-composed inner content (headings, paragraphs,
 * buttons, tables). `footerNote` overrides the default "skickades av …" line.
 */
export declare function renderEmailShell(opts: {
    brandName: string;
    bodyHtml: string;
    /** Extra footer HTML (e.g. a support link) appended after the brand line. */
    footerExtraHtml?: string;
    /** Override the whole footer note (defaults to "Detta meddelande skickades av {brandName}."). */
    footerNote?: string;
    /** Preheader text (hidden inbox preview). */
    preheader?: string;
}): string;
/** Section heading inside the card. */
export declare function renderHeading(text: string): string;
/** Body paragraph. Pass `muted:true` for secondary text. `html:true` to allow inline markup. */
export declare function renderParagraph(text: string, opts?: {
    muted?: boolean;
    html?: boolean;
}): string;
/** Primary pill CTA. NEVER a blue link — this is the one call-to-action style. */
export declare function renderButton(href: string, label: string): string;
/** Centered code panel for reset/verification codes. */
export declare function renderCodeBox(code: string): string;
/**
 * A key/value list rendered as a clean hairline table. Values may be raw HTML
 * (already escaped by caller) when `rawHtml` is set.
 */
export declare function renderKeyValueRows(rows: Array<{
    label: string;
    value: string;
}>, opts?: {
    rawHtml?: boolean;
}): string;
/**
 * A subtle bordered panel to group content (e.g. credentials, links).
 * `title` is optional; `bodyHtml` is already-composed inner markup.
 */
export declare function renderPanel(bodyHtml: string, title?: string): string;
/** A bullet list. Items may be raw HTML when `rawHtml` is set. */
export declare function renderList(items: string[], opts?: {
    rawHtml?: boolean;
    muted?: boolean;
}): string;
/**
 * An order-line table: product name (+ optional meta line) and a right-aligned
 * amount, separated by hairlines. `rows[].meta` is raw HTML (pills etc.).
 */
export declare function renderOrderRows(rows: Array<{
    name: string;
    meta?: string;
    qtyLine?: string;
    amount: string;
}>): string;
/**
 * Totals table (delsumma/frakt/rabatt/moms/totalt). Rows are {label, value,
 * emphasis?}. The final emphasised row gets a top rule and larger type.
 */
export declare function renderTotals(rows: Array<{
    label: string;
    value: string;
    emphasis?: boolean;
    positive?: boolean;
}>): string;
/**
 * A plain (non-CTA) inline text link, used inside paragraphs/footers.
 * Muted ink, underlined — deliberately NOT the blue primary-action style.
 */
export declare function renderTextLink(href: string, label: string): string;
/** Footer support line: "Behöver du hjälp? {link}" / EN equivalent. */
export declare function renderFooterSupport(url: string, lang?: string): string;
