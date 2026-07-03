// Connect Status Change Template — shop-owner alert that their Stripe Connect
// account status changed in a way that can block payouts. Fired from the
// account.updated webhook on meaningful transitions only. CTA → /admin/payments.
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderList,
} from './emailLayout';

export interface ConnectStatusChangeData {
  /** Human-readable Swedish descriptions of what changed. */
  changes: string[];
  /** Absolute URL to the admin payments page (appUrls.ADMIN_BASE + /admin/payments). */
  paymentsUrl: string;
  brandName?: string;
}

export function generateConnectStatusChangeTemplate(data: ConnectStatusChangeData): { subject: string; html: string; text: string } {
  const brand = data.brandName || 'MeteorPR';
  const changes = Array.isArray(data.changes) ? data.changes : [];

  const body =
    renderHeading('Uppdatering om dina utbetalningar') +
    renderParagraph('Statusen för ditt Stripe-anslutna konto har ändrats:') +
    (changes.length ? renderList(changes) : renderParagraph('Kontrollera din betalningsstatus.', { muted: true })) +
    renderParagraph('Öppna betalningssidan för att se detaljer och åtgärda eventuella krav.') +
    renderButton(data.paymentsUrl, 'Öppna betalningar');

  return {
    subject: 'Uppdatering om dina utbetalningar (Stripe)',
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      preheader: 'Din Stripe-status har ändrats',
    }),
    text:
      `Uppdatering om dina utbetalningar (Stripe)\n` +
      (changes.length ? changes.map((c) => `- ${c}`).join('\n') + '\n' : '') +
      `Öppna betalningar: ${data.paymentsUrl}`,
  };
}
