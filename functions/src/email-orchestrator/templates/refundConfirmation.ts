// Refund Confirmation Template — buyer-facing refund receipt. NORD-aligned,
// per-shop branded. Fired from connectRefund.ts after a refund succeeds.
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderKeyValueRows,
} from './emailLayout';

export interface RefundConfirmationData {
  orderNumber: string;
  /** Amount actually refunded, in the buyer-facing currency unit (SEK). */
  refundAmountSek: number;
  currency?: string;
  /** True = full refund; false = partial. Drives the copy. */
  isFullRefund: boolean;
  /** True when the order carried a withdrawalRequest (exercised ångerrätt). */
  hasWithdrawal?: boolean;
  customerName?: string;
  brandName?: string;
}

export function generateRefundConfirmationTemplate(data: RefundConfirmationData): { subject: string; html: string; text: string } {
  const brand = data.brandName || 'MeteorPR';
  const orderNumber = String(data.orderNumber || '');
  const amountLabel = `${Number(data.refundAmountSek || 0).toFixed(0)} ${data.currency || 'SEK'}`;

  const body =
    renderHeading('Återbetalning genomförd') +
    renderParagraph(`Hej${data.customerName ? ` ${data.customerName}` : ''},`) +
    renderParagraph(
      data.isFullRefund
        ? 'Vi har genomfört en full återbetalning av din beställning.'
        : 'Vi har genomfört en delåterbetalning av din beställning.'
    ) +
    renderKeyValueRows([
      { label: 'Order', value: orderNumber },
      { label: 'Återbetalat belopp', value: amountLabel },
    ]) +
    renderParagraph('Pengarna når dig inom några bankdagar beroende på din bank.') +
    (data.hasWithdrawal
      ? renderParagraph('Detta slutför din utövade ångerrätt. Tack för att du meddelade oss.', { muted: true })
      : '');

  return {
    subject: `Återbetalning – order ${orderNumber}`.trim(),
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      preheader: `Återbetalning – order ${orderNumber}`.trim(),
    }),
    text:
      `Återbetalning – order ${orderNumber}\n` +
      `Återbetalat belopp: ${amountLabel}\n` +
      `Pengarna når dig inom några bankdagar beroende på din bank.` +
      (data.hasWithdrawal ? `\nDetta slutför din utövade ångerrätt.` : ''),
  };
}
