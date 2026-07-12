// Review-request email — NORD-aligned, per-shop branded. Sent once per fulfilled
// order by the review sweep (product-reviews/sweep.ts) a configurable number of
// days after delivery. Asks the buyer to leave a review via a personal link.
// Includes a one-click List-Unsubscribe footer link (the orchestrator also sets
// the List-Unsubscribe header for this type).
//
// ⚠️ INVARIANT: this generator is fully SYNCHRONOUS (no awaits) — the orchestrator
// sets the per-shop logo on the shared shell right before calling it.
//
// SECURITY: every user/order-derived string is escaped. renderOrderRows escapes
// name/image internally; the first-name greeting is passed through renderParagraph
// (which escapes) so it is NOT pre-escaped here (double-escaping mangles O'Brien).

import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderOrderRows,
  renderTextLink,
} from './emailLayout';

export interface ReviewRequestItem {
  productId?: string;
  name?: any; // may be an i18n object from a legacy doc — flattened below
  image?: string;
}

export interface ReviewRequestData {
  brandName: string;
  customerFirstName?: string;
  items: ReviewRequestItem[];
  reviewUrl: string;
  unsubscribeUrl: string;
}

// Defensive i18n-name flatten (the trigger stores flat strings, but never trust
// the data — an "[object Object]" in an email is worse than a generic label).
function flattenName(name: any, en: boolean): string {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') {
    const s =
      name['sv-SE'] || name['en-GB'] || name['en-US'] ||
      (Object.values(name).find((v) => typeof v === 'string') as string) || '';
    if (s) return s;
  }
  return en ? 'Product' : 'Produkt';
}

export function generateReviewRequestTemplate(
  data: ReviewRequestData,
  lang: string = 'sv-SE'
) {
  const brand = data.brandName || 'ChopShop';
  const en = lang.startsWith('en');
  const items = Array.isArray(data.items) ? data.items : [];
  const firstName = typeof data.customerFirstName === 'string' ? data.customerFirstName.trim() : '';

  // No esc() here — renderParagraph escapes its text.
  const greeting = firstName
    ? (en ? `Hi ${firstName},` : `Hej ${firstName},`)
    : (en ? 'Hi,' : 'Hej,');

  // renderOrderRows escapes name + image itself; no amount/qty for a review nudge.
  const itemRows = renderOrderRows(
    items.map((it) => ({
      name: flattenName(it.name, en),
      amount: '',
      image: typeof it.image === 'string' ? it.image : undefined,
    }))
  );

  const subject = en
    ? (firstName
        ? `Hi ${firstName}, how was your purchase from ${brand}?`
        : `How was your purchase from ${brand}?`)
    : (firstName
        ? `Hej ${firstName}, vad tyckte du om ditt köp hos ${brand}?`
        : `Vad tyckte du om ditt köp hos ${brand}?`);

  const preheader = en
    ? 'Share a quick review — it only takes a minute.'
    : 'Lämna ett snabbt omdöme — det tar bara en minut.';

  const unsubLabel = en
    ? 'Unsubscribe from review requests'
    : 'Avregistrera dig från recensionsförfrågningar';

  const body =
    renderHeading(en ? 'How was your purchase?' : 'Vad tyckte du om ditt köp?') +
    renderParagraph(greeting) +
    renderParagraph(
      en
        ? 'Thank you for your purchase! We would love to hear what you think.'
        : 'Tack för ditt köp! Vi vill gärna höra vad du tycker.'
    ) +
    itemRows +
    renderButton(data.reviewUrl, en ? 'Leave a review' : 'Lämna ett omdöme') +
    renderParagraph(en ? 'It only takes a minute.' : 'Det tar bara en minut.', { muted: true });

  // One-click unsubscribe link in the footer (paired with the List-Unsubscribe
  // header set by the orchestrator for this email type).
  const footerExtraHtml = `<p style="margin:6px 0 0 0;font-size:12px;line-height:1.6;color:#6B7280;">${renderTextLink(
    data.unsubscribeUrl,
    unsubLabel
  )}</p>`;

  return {
    subject,
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      preheader,
      footerExtraHtml,
    }),
  };
}
