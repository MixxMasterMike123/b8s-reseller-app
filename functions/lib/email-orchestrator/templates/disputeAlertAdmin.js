"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDisputeAlertAdminTemplate = void 0;
// Dispute / Shortfall Alert Template — PLATFORM-admin internal alert for a
// Stripe chargeback or a failed recovery (shortfall). Fired best-effort from
// stripeWebhook.ts. Names the shop so a multi-shop inbox can triage.
const emailLayout_1 = require("./emailLayout");
function generateDisputeAlertAdminTemplate(data) {
    const brand = data.brandName || 'ChopShop';
    const shopLabel = data.shopName ? `${data.shopName} (${data.shopId || ''})` : String(data.shopId || 'okänd butik');
    const kind = data.alertKind === 'shortfall' ? 'Underskott vid återkravshantering' : 'Nytt återkrav (dispute)';
    const body = (0, emailLayout_1.renderHeading)(kind) +
        (0, emailLayout_1.renderParagraph)(`Butik: ${(0, emailLayout_1.esc)(shopLabel)}`) +
        (0, emailLayout_1.renderKeyValueRows)([
            { label: 'Order', value: String(data.orderNumber || data.orderId || '') },
            { label: 'Dispute-ID', value: String(data.disputeId || '') },
            { label: 'Anledning', value: String(data.reason || '') },
            { label: 'Belopp', value: data.amount !== undefined && data.amount !== null ? String(data.amount) : '' },
            { label: 'Status', value: String(data.status || '') },
        ]) +
        (data.recoveryStatus
            ? (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderParagraph)(`Återkravsstatus: ${(0, emailLayout_1.esc)(String(data.recoveryStatus))}`, { muted: true }))
            : '') +
        (0, emailLayout_1.renderParagraph)('Kontrollera Stripe-dashboarden och stäm av mot ordern.', { muted: true });
    return {
        subject: `${kind}: ${data.shopName || data.shopId || ''} – order ${data.orderNumber || data.orderId || ''}`.trim(),
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            preheader: `${kind} – ${data.orderNumber || data.orderId || ''}`.trim(),
        }),
        text: `${kind}\nButik: ${shopLabel}\nOrder: ${data.orderNumber || data.orderId || ''}\n` +
            `Dispute: ${data.disputeId || ''}\nAnledning: ${data.reason || ''}\nStatus: ${data.status || ''}` +
            (data.recoveryStatus ? `\nÅterkravsstatus: ${data.recoveryStatus}` : ''),
    };
}
exports.generateDisputeAlertAdminTemplate = generateDisputeAlertAdminTemplate;
//# sourceMappingURL=disputeAlertAdmin.js.map