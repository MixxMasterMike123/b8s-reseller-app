"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConnectStatusChangeTemplate = void 0;
// Connect Status Change Template — shop-owner alert that their Stripe Connect
// account status changed in a way that can block payouts. Fired from the
// account.updated webhook on meaningful transitions only. CTA → /admin/payments.
const emailLayout_1 = require("./emailLayout");
function generateConnectStatusChangeTemplate(data) {
    const brand = data.brandName || 'MeteorPR';
    const changes = Array.isArray(data.changes) ? data.changes : [];
    const body = (0, emailLayout_1.renderHeading)('Uppdatering om dina utbetalningar') +
        (0, emailLayout_1.renderParagraph)('Statusen för ditt Stripe-anslutna konto har ändrats:') +
        (changes.length ? (0, emailLayout_1.renderList)(changes) : (0, emailLayout_1.renderParagraph)('Kontrollera din betalningsstatus.', { muted: true })) +
        (0, emailLayout_1.renderParagraph)('Öppna betalningssidan för att se detaljer och åtgärda eventuella krav.') +
        (0, emailLayout_1.renderButton)(data.paymentsUrl, 'Öppna betalningar');
    return {
        subject: 'Uppdatering om dina utbetalningar (Stripe)',
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            preheader: 'Din Stripe-status har ändrats',
        }),
        text: `Uppdatering om dina utbetalningar (Stripe)\n` +
            (changes.length ? changes.map((c) => `- ${c}`).join('\n') + '\n' : '') +
            `Öppna betalningar: ${data.paymentsUrl}`,
    };
}
exports.generateConnectStatusChangeTemplate = generateConnectStatusChangeTemplate;
//# sourceMappingURL=connectStatusChange.js.map