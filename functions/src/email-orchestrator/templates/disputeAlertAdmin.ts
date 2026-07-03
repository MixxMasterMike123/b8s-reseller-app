// Dispute / Shortfall Alert Template — PLATFORM-admin internal alert for a
// Stripe chargeback or a failed recovery (shortfall). Fired best-effort from
// stripeWebhook.ts. Names the shop so a multi-shop inbox can triage.
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderKeyValueRows,
  renderPanel,
  esc,
} from './emailLayout';

export interface DisputeAlertAdminData {
  shopId?: string;
  shopName?: string;
  orderId?: string;
  orderNumber?: string;
  disputeId?: string;
  reason?: string;
  amount?: number | null;
  status?: string;
  alertKind: 'dispute' | 'shortfall';
  recoveryStatus?: string;
  brandName?: string;
}

export function generateDisputeAlertAdminTemplate(data: DisputeAlertAdminData): { subject: string; html: string; text: string } {
  const brand = data.brandName || 'MeteorPR';
  const shopLabel = data.shopName ? `${data.shopName} (${data.shopId || ''})` : String(data.shopId || 'okänd butik');
  const kind = data.alertKind === 'shortfall' ? 'Underskott vid återkravshantering' : 'Nytt återkrav (dispute)';

  const body =
    renderHeading(kind) +
    renderParagraph(`Butik: ${esc(shopLabel)}`) +
    renderKeyValueRows([
      { label: 'Order', value: String(data.orderNumber || data.orderId || '') },
      { label: 'Dispute-ID', value: String(data.disputeId || '') },
      { label: 'Anledning', value: String(data.reason || '') },
      { label: 'Belopp', value: data.amount !== undefined && data.amount !== null ? String(data.amount) : '' },
      { label: 'Status', value: String(data.status || '') },
    ]) +
    (data.recoveryStatus
      ? renderPanel(renderParagraph(`Återkravsstatus: ${esc(String(data.recoveryStatus))}`, { muted: true }))
      : '') +
    renderParagraph('Kontrollera Stripe-dashboarden och stäm av mot ordern.', { muted: true });

  return {
    subject: `${kind}: ${data.shopName || data.shopId || ''} – order ${data.orderNumber || data.orderId || ''}`.trim(),
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      preheader: `${kind} – ${data.orderNumber || data.orderId || ''}`.trim(),
    }),
    text:
      `${kind}\nButik: ${shopLabel}\nOrder: ${data.orderNumber || data.orderId || ''}\n` +
      `Dispute: ${data.disputeId || ''}\nAnledning: ${data.reason || ''}\nStatus: ${data.status || ''}` +
      (data.recoveryStatus ? `\nÅterkravsstatus: ${data.recoveryStatus}` : ''),
  };
}
