// Print Order Notification Template — "Ny POD-order" to the shop's PRINTERS.
//
// This is neither a customer email nor a shop-admin email: it goes to the
// assigned print_shop users. It is PRODUCTION-SCOPED by design — order number,
// shop name, POD line count, and per-line product name/SKU/qty/placement +
// delivery method (Upphämtning vs frakt) + a link to the print portal. It
// carries NO customer name/email/address and NO amounts (the same data-
// minimisation boundary the print callable projection enforces).
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderKeyValueRows,
  renderPanel,
  renderList,
  renderButton,
  esc,
} from './emailLayout';

export interface PrintOrderNotificationLine {
  productName: string;
  sku: string;
  quantity: number;
  placement: string; // slot-aware label, e.g. "Bröst — Centrerat på bröstet"
}

export interface PrintOrderNotificationData {
  orderNumber: string;
  shopName: string;
  deliveryMethod: 'pickup' | 'home';
  lines: PrintOrderNotificationLine[];
  printPortalUrl: string;
  brandName?: string;
}

export function generatePrintOrderNotificationTemplate(
  data: PrintOrderNotificationData
): { subject: string; html: string; text: string } {
  const brand = data.brandName || 'MeteorPR';
  const lineCount = data.lines.length;
  const deliveryLabel = data.deliveryMethod === 'pickup' ? 'Upphämtning' : 'Frakt till kund';

  const lineItems = data.lines.map((ln) => {
    const parts = [
      `<strong>${esc(ln.productName || ln.sku)}</strong>`,
      ln.sku ? `<span style="font-family:monospace">${esc(ln.sku)}</span>` : '',
      `× ${esc(ln.quantity || 0)}`,
      ln.placement ? `— ${esc(ln.placement)}` : '',
    ].filter(Boolean);
    return parts.join(' ');
  });

  const body =
    renderHeading('Ny POD-order att trycka') +
    renderParagraph(`Det har kommit in en ny order med tryckrader för ${esc(data.shopName)}.`) +
    renderKeyValueRows([
      { label: 'Order', value: String(data.orderNumber || '') },
      { label: 'Butik', value: String(data.shopName || '') },
      { label: 'Tryckrader', value: String(lineCount) },
      { label: 'Leverans', value: deliveryLabel },
    ]) +
    (lineItems.length
      ? renderPanel(renderList(lineItems, { rawHtml: true }), 'Produktionsrader')
      : renderParagraph('Inga tryckrader kunde läsas ut.', { muted: true })) +
    renderButton(data.printPortalUrl, 'Öppna print-portalen') +
    renderParagraph(
      'Öppna ordern i print-portalen för leveransadress och nedladdning av original.',
      { muted: true }
    );

  const textLines = data.lines
    .map((ln) => `- ${ln.productName || ln.sku} (${ln.sku}) × ${ln.quantity}${ln.placement ? ` — ${ln.placement}` : ''}`)
    .join('\n');

  return {
    subject: `Ny POD-order: ${data.orderNumber || ''} (${data.shopName || ''})`.trim(),
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      preheader: `Ny POD-order ${data.orderNumber || ''} – ${lineCount} tryckrad(er)`.trim(),
    }),
    text:
      `Ny POD-order att trycka\n` +
      `Order: ${data.orderNumber || ''}\nButik: ${data.shopName || ''}\n` +
      `Tryckrader: ${lineCount}\nLeverans: ${deliveryLabel}\n\n` +
      `${textLines}\n\n` +
      `Öppna print-portalen: ${data.printPortalUrl}`,
  };
}
