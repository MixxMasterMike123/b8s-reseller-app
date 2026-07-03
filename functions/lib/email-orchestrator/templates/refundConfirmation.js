"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefundConfirmationTemplate = void 0;
// Refund Confirmation Template — buyer-facing refund receipt. NORD-aligned,
// per-shop branded. Fired from connectRefund.ts after a refund succeeds.
const emailLayout_1 = require("./emailLayout");
function generateRefundConfirmationTemplate(data) {
    const brand = data.brandName || 'MeteorPR';
    const orderNumber = String(data.orderNumber || '');
    const amountLabel = `${Number(data.refundAmountSek || 0).toFixed(0)} ${data.currency || 'SEK'}`;
    const body = (0, emailLayout_1.renderHeading)('Återbetalning genomförd') +
        (0, emailLayout_1.renderParagraph)(`Hej${data.customerName ? ` ${data.customerName}` : ''},`) +
        (0, emailLayout_1.renderParagraph)(data.isFullRefund
            ? 'Vi har genomfört en full återbetalning av din beställning.'
            : 'Vi har genomfört en delåterbetalning av din beställning.') +
        (0, emailLayout_1.renderKeyValueRows)([
            { label: 'Order', value: orderNumber },
            { label: 'Återbetalat belopp', value: amountLabel },
        ]) +
        (0, emailLayout_1.renderParagraph)('Pengarna når dig inom några bankdagar beroende på din bank.') +
        (data.hasWithdrawal
            ? (0, emailLayout_1.renderParagraph)('Detta slutför din utövade ångerrätt. Tack för att du meddelade oss.', { muted: true })
            : '');
    return {
        subject: `Återbetalning – order ${orderNumber}`.trim(),
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            preheader: `Återbetalning – order ${orderNumber}`.trim(),
        }),
        text: `Återbetalning – order ${orderNumber}\n` +
            `Återbetalat belopp: ${amountLabel}\n` +
            `Pengarna når dig inom några bankdagar beroende på din bank.` +
            (data.hasWithdrawal ? `\nDetta slutför din utövade ångerrätt.` : ''),
    };
}
exports.generateRefundConfirmationTemplate = generateRefundConfirmationTemplate;
//# sourceMappingURL=refundConfirmation.js.map