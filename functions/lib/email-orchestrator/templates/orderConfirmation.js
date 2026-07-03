"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderConfirmationTemplate = void 0;
// Order Confirmation Email Template — NORD-aligned, per-shop branded.
const config_1 = require("../core/config");
const emailLayout_1 = require("./emailLayout");
// Helper function to get product name from multilingual object
function getProductName(item, lang) {
    if (typeof item.name === 'object') {
        return item.name[lang] || item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'Okänd produkt';
    }
    return item.name || 'Okänd produkt';
}
function getDisplaySize(size) {
    if (!size)
        return '-';
    if (typeof size === 'string')
        return size;
    if (typeof size === 'object') {
        return size['sv-SE'] || size['en-GB'] || size['en-US'] || Object.values(size)[0] || '-';
    }
    return String(size);
}
function getDisplayColor(color) {
    if (!color)
        return '-';
    if (typeof color === 'string')
        return color;
    if (typeof color === 'object') {
        return color['sv-SE'] || color['en-GB'] || color['en-US'] || Object.values(color)[0] || '-';
    }
    return String(color);
}
// Variant/color pill. Product model v2: a variant `label` carries the choice;
// old orders fall back to color.
function getColorPill(item) {
    const pill = (text) => `<span style="display:inline-block;background-color:${emailLayout_1.emailTokens.panel};color:${emailLayout_1.emailTokens.ink};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;margin-right:6px;border:1px solid ${emailLayout_1.emailTokens.border};">${(0, emailLayout_1.esc)(text)}</span>`;
    if (item.label)
        return pill(item.label);
    const color = getDisplayColor(item.color);
    if (!color || color === '-' || color === 'Blandade färger' || color === 'Mixed colors')
        return '';
    return pill(`Färg: ${color}`);
}
function getSizePill(item, lang) {
    const size = getDisplaySize(item.size);
    if (!size || size === '-' || size === 'Blandade storlekar' || size === 'Mixed sizes')
        return '';
    const sizeLabel = lang.startsWith('en') ? 'Size' : 'Storlek';
    return `<span style="display:inline-block;background-color:${emailLayout_1.emailTokens.panel};color:${emailLayout_1.emailTokens.ink};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;margin-right:6px;border:1px solid ${emailLayout_1.emailTokens.border};">${(0, emailLayout_1.esc)(sizeLabel)}: ${(0, emailLayout_1.esc)(size)}</span>`;
}
function getPillsRow(item, lang) {
    const pills = getColorPill(item) + getSizePill(item, lang);
    return pills || '';
}
function generateOrderConfirmationTemplate(data, lang = 'sv-SE', orderId) {
    const { orderData, customerInfo, orderType } = data;
    const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
    const customerName = (customerInfo.firstName ? customerInfo.firstName + (customerInfo.lastName ? ' ' + customerInfo.lastName : '') : '') ||
        customerInfo.name ||
        (lang.startsWith('en') ? 'there' : 'Kund');
    // USE ORDER DB ID NOT ORDER NUMBER (same pattern as status update)
    const finalOrderId = orderId || data.orderId;
    const orderUrl = (0, config_1.getOrderTrackingUrl)(finalOrderId, lang);
    const supportUrl = (0, config_1.getSupportUrl)(lang);
    if (orderType === 'B2B') {
        return generateB2BTemplate(data, lang, customerName, supportUrl);
    }
    return generateB2CTemplate(data, lang, customerName, orderUrl, supportUrl, affiliateCode);
}
exports.generateOrderConfirmationTemplate = generateOrderConfirmationTemplate;
// B2C Template (Consumer-focused)
function generateB2CTemplate(data, lang, customerName, orderUrl, supportUrl, affiliateCode) {
    const { orderData, customerInfo } = data;
    const brand = data.brandName || 'MeteorPR';
    const { orderNumber, items, subtotal, shipping, vat, total, discountAmount = 0 } = orderData;
    const en = lang.startsWith('en');
    const rows = (0, emailLayout_1.renderOrderRows)(items.map((item) => ({
        name: getProductName(item, lang),
        meta: getPillsRow(item, lang) || undefined,
        qtyLine: `${item.quantity} ${en ? 'pcs' : 'st'} × ${(0, config_1.formatPrice)(item.price)}`,
        amount: (0, config_1.formatPrice)(item.price * item.quantity),
    })));
    const totals = (0, emailLayout_1.renderTotals)([
        { label: en ? 'Subtotal' : 'Delsumma', value: (0, config_1.formatPrice)(subtotal) },
        { label: en ? 'Shipping' : 'Frakt', value: (0, config_1.formatPrice)(shipping) },
        ...(discountAmount > 0
            ? [{
                    label: `${en ? 'Discount' : 'Rabatt'}${affiliateCode ? ' (' + affiliateCode + ')' : ''}`,
                    value: `-${(0, config_1.formatPrice)(discountAmount)}`,
                    positive: true,
                }]
            : []),
        { label: en ? 'VAT (25%)' : 'Moms (25%)', value: (0, config_1.formatPrice)(vat) },
        { label: en ? 'Total' : 'Totalt', value: (0, config_1.formatPrice)(total), emphasis: true },
    ]);
    const detailRows = (0, emailLayout_1.renderKeyValueRows)([
        { label: en ? 'Order number' : 'Ordernummer', value: orderNumber },
        { label: en ? 'Status' : 'Status', value: en ? 'Received' : 'Mottagen' },
        { label: en ? 'Email' : 'E-post', value: customerInfo.email },
    ]);
    const body = (0, emailLayout_1.renderHeading)(en ? `Thank you, ${(0, emailLayout_1.esc)(customerName)}!` : `Tack, ${(0, emailLayout_1.esc)(customerName)}!`) +
        (0, emailLayout_1.renderParagraph)(en
            ? `We’ve received your order and will start processing it right away.`
            : `Vi har tagit emot din beställning och börjar behandla den direkt.`) +
        detailRows +
        rows +
        totals +
        (0, emailLayout_1.renderButton)(orderUrl, en ? 'View order' : 'Visa order');
    return {
        subject: en
            ? `Thank you for your order, ${customerName}! (Order ${orderNumber})`
            : `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            footerExtraHtml: (0, emailLayout_1.renderFooterSupport)(supportUrl, lang),
            preheader: en ? `Order ${orderNumber} confirmed` : `Order ${orderNumber} bekräftad`,
        }),
    };
}
// B2B Template (Business-focused)
function generateB2BTemplate(data, lang, customerName, supportUrl) {
    const { orderData } = data;
    const brand = data.brandName || 'MeteorPR';
    const { orderNumber, total } = orderData;
    const en = lang.startsWith('en');
    const detailRows = (0, emailLayout_1.renderKeyValueRows)([
        { label: en ? 'Order number' : 'Ordernummer', value: orderNumber },
        { label: en ? 'Company' : 'Företag', value: customerName },
        { label: en ? 'Total (incl. your margin)' : 'Totalt (inkl. din marginal)', value: (0, config_1.formatPrice)(total) },
    ]);
    const body = (0, emailLayout_1.renderHeading)(en ? 'Order confirmation' : 'Orderbekräftelse') +
        (0, emailLayout_1.renderParagraph)(en ? `Hi ${(0, emailLayout_1.esc)(customerName)},` : `Hej ${(0, emailLayout_1.esc)(customerName)},`) +
        (0, emailLayout_1.renderParagraph)(en
            ? 'Thank you for your order. We’ve received it and will start processing it right away.'
            : 'Tack för din beställning. Vi har tagit emot den och börjar behandla den direkt.') +
        detailRows +
        (0, emailLayout_1.renderButton)(config_1.EMAIL_CONFIG.URLS.B2B_PORTAL, en ? 'Go to the portal' : 'Gå till portalen');
    return {
        subject: en ? `Order confirmation: ${orderNumber}` : `Orderbekräftelse: ${orderNumber}`,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            footerExtraHtml: (0, emailLayout_1.renderFooterSupport)(supportUrl, lang),
            preheader: en ? `Order ${orderNumber} confirmed` : `Order ${orderNumber} bekräftad`,
        }),
    };
}
//# sourceMappingURL=orderConfirmation.js.map