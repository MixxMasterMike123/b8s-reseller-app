// Abandoned-checkout reminder email — NORD-aligned, per-shop branded.
// Sent once per abandoned checkout by the recovery sweep (sweep.ts). NO discount
// language (this is a plain "you left something" nudge, not a promo). Includes a
// one-click List-Unsubscribe footer link (the orchestrator also sets the
// List-Unsubscribe header for this type).
//
// ⚠️ INVARIANT: this generator is fully SYNCHRONOUS (no awaits) — the orchestrator
// sets the per-shop logo on the shared shell right before calling it.

import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderOrderRows,
  renderTotals,
  renderTextLink,
  esc,
} from './emailLayout';

export interface AbandonedCheckoutItem {
  name?: string;
  label?: string;
  quantity?: number;
  price?: number;
}

export interface AbandonedCheckoutReminderData {
  brandName: string;
  customerFirstName?: string;
  items: AbandonedCheckoutItem[];
  totals?: {
    subtotal?: number;
    vat?: number;
    shipping?: number;
    discountAmount?: number;
    total?: number;
  };
  recoveryUrl: string;
  unsubscribeUrl: string;
}

const money = (n: number): string => `${Math.round(Number(n) || 0)} kr`;

export function generateAbandonedCheckoutReminderTemplate(
  data: AbandonedCheckoutReminderData,
  lang: string = 'sv-SE'
) {
  const brand = data.brandName || 'ChopShop';
  const en = lang.startsWith('en');
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number(data.totals?.total) || 0;

  // No esc() here — renderParagraph escapes its text, double-escaping mangles names like O'Brien.
  const greeting = data.customerFirstName
    ? (en ? `Hi ${data.customerFirstName},` : `Hej ${data.customerFirstName},`)
    : (en ? 'Hi,' : 'Hej,');

  const itemRows = renderOrderRows(
    items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const unit = Number(it.price) || 0;
      return {
        name: it.name || (en ? 'Product' : 'Produkt'),
        meta: it.label
          ? `<span style="font-size:13px;color:#6B7280;">${esc(it.label)}</span>`
          : undefined,
        qtyLine: en ? `Quantity: ${qty}` : `Antal: ${qty}`,
        amount: money(unit * qty),
      };
    })
  );

  // Show shipping/discount rows so the visible numbers reconcile with the total
  // (item lines are VAT-inclusive; total = items + shipping − discount).
  const shipping = Number(data.totals?.shipping) || 0;
  const discount = Number(data.totals?.discountAmount) || 0;
  const totalsBlock = total > 0
    ? renderTotals([
        ...(shipping > 0 ? [{ label: en ? 'Shipping' : 'Frakt', value: money(shipping) }] : []),
        ...(discount > 0 ? [{ label: en ? 'Discount' : 'Rabatt', value: `−${money(discount)}` }] : []),
        { label: en ? 'Total' : 'Totalt', value: money(total), emphasis: true },
      ])
    : '';

  const subject = en
    ? `You left something in your cart at ${brand}`
    : `Du glömde något i kassan hos ${brand}`;

  const preheader = en
    ? 'We saved your cart — complete your purchase whenever you like.'
    : 'Vi sparade din varukorg — slutför köpet när du vill.';

  const unsubLabel = en ? 'Unsubscribe from reminders' : 'Avregistrera dig från påminnelser';

  const body =
    renderHeading(en ? 'You left something in your cart' : 'Du glömde något i kassan') +
    renderParagraph(greeting) +
    renderParagraph(
      en
        ? 'We saved your cart, so you can pick up right where you left off.'
        : 'Vi sparade din varukorg så att du kan fortsätta där du slutade.'
    ) +
    itemRows +
    totalsBlock +
    renderButton(data.recoveryUrl, en ? 'Complete your purchase' : 'Slutför köpet');

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
