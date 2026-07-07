"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePrintOrderNotificationTemplate = void 0;
// Print Order Notification Template — "Ny POD-order" to the shop's PRINTERS.
//
// This is neither a customer email nor a shop-admin email: it goes to the
// assigned print_shop users. It is PRODUCTION-SCOPED by design — order number,
// shop name, POD line count, and per-line product name/SKU/qty/placement +
// delivery method (Upphämtning vs frakt) + a link to the print portal. It
// carries NO customer name/email/address and NO amounts (the same data-
// minimisation boundary the print callable projection enforces).
const emailLayout_1 = require("./emailLayout");
function generatePrintOrderNotificationTemplate(data) {
    const brand = data.brandName || 'MeteorPR';
    const lineCount = data.lines.length;
    const deliveryLabel = data.deliveryMethod === 'pickup' ? 'Upphämtning' : 'Frakt till kund';
    const lineItems = data.lines.map((ln) => {
        const parts = [
            `<strong>${(0, emailLayout_1.esc)(ln.productName || ln.sku)}</strong>`,
            ln.sku ? `<span style="font-family:monospace">${(0, emailLayout_1.esc)(ln.sku)}</span>` : '',
            `× ${(0, emailLayout_1.esc)(ln.quantity || 0)}`,
            ln.placement ? `— ${(0, emailLayout_1.esc)(ln.placement)}` : '',
        ].filter(Boolean);
        return parts.join(' ');
    });
    const body = (0, emailLayout_1.renderHeading)('Ny POD-order att trycka') +
        (0, emailLayout_1.renderParagraph)(`Det har kommit in en ny order med tryckrader för ${(0, emailLayout_1.esc)(data.shopName)}.`) +
        (0, emailLayout_1.renderKeyValueRows)([
            { label: 'Order', value: String(data.orderNumber || '') },
            { label: 'Butik', value: String(data.shopName || '') },
            { label: 'Tryckrader', value: String(lineCount) },
            { label: 'Leverans', value: deliveryLabel },
        ]) +
        (lineItems.length
            ? (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderList)(lineItems, { rawHtml: true }), 'Produktionsrader')
            : (0, emailLayout_1.renderParagraph)('Inga tryckrader kunde läsas ut.', { muted: true })) +
        (0, emailLayout_1.renderButton)(data.printPortalUrl, 'Öppna print-portalen') +
        (0, emailLayout_1.renderParagraph)('Öppna ordern i print-portalen för leveransadress och nedladdning av original.', { muted: true });
    const textLines = data.lines
        .map((ln) => `- ${ln.productName || ln.sku} (${ln.sku}) × ${ln.quantity}${ln.placement ? ` — ${ln.placement}` : ''}`)
        .join('\n');
    return {
        subject: `Ny POD-order: ${data.orderNumber || ''} (${data.shopName || ''})`.trim(),
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            preheader: `Ny POD-order ${data.orderNumber || ''} – ${lineCount} tryckrad(er)`.trim(),
        }),
        text: `Ny POD-order att trycka\n` +
            `Order: ${data.orderNumber || ''}\nButik: ${data.shopName || ''}\n` +
            `Tryckrader: ${lineCount}\nLeverans: ${deliveryLabel}\n\n` +
            `${textLines}\n\n` +
            `Öppna print-portalen: ${data.printPortalUrl}`,
    };
}
exports.generatePrintOrderNotificationTemplate = generatePrintOrderNotificationTemplate;
//# sourceMappingURL=printOrderNotification.js.map