"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderNotificationAdminTemplate = void 0;
// Admin Order Notification Email Template — NORD-aligned, per-shop branded.
// Internal notification (Swedish); English variants kept as light stubs.
const config_1 = require("../core/config");
const app_urls_1 = require("../../config/app-urls");
const emailLayout_1 = require("./emailLayout");
function getDisplaySize(size) {
    if (!size)
        return '-';
    if (typeof size === 'string')
        return size;
    if (typeof size === 'object')
        return size['sv-SE'] || size['en-GB'] || size['en-US'] || Object.values(size)[0] || '-';
    return String(size);
}
function getDisplayColor(color) {
    if (!color)
        return '-';
    if (typeof color === 'string')
        return color;
    if (typeof color === 'object')
        return color['sv-SE'] || color['en-GB'] || color['en-US'] || Object.values(color)[0] || '-';
    return String(color);
}
function getCleanProductNameAdmin(item) {
    return typeof item.name === 'object'
        ? item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || JSON.stringify(item.name)
        : item.name || 'Unknown Product';
}
function pill(text) {
    return `<span style="display:inline-block;background-color:${emailLayout_1.emailTokens.panel};color:${emailLayout_1.emailTokens.ink};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;margin-right:6px;border:1px solid ${emailLayout_1.emailTokens.border};">${(0, emailLayout_1.esc)(text)}</span>`;
}
function getPillsRowAdmin(item) {
    let out = '';
    if (item.label) {
        out += pill(item.label);
    }
    else {
        const color = getDisplayColor(item.color);
        if (color && color !== '-' && color !== 'Blandade färger' && color !== 'Mixed colors')
            out += pill(`Färg: ${color}`);
    }
    const size = getDisplaySize(item.size);
    if (size && size !== '-' && size !== 'Blandade storlekar' && size !== 'Mixed sizes')
        out += pill(`Storlek: ${size}`);
    return out;
}
function formatPaymentMethod(method) {
    switch (method) {
        case 'stripe': return 'Stripe (Card/Klarna/Google Pay)';
        case 'mock_payment': return 'Test Payment';
        case 'swish': return 'Swish';
        case 'klarna': return 'Klarna';
        default: return method;
    }
}
function generateOrderNotificationAdminTemplate(data, lang = 'sv-SE') {
    const { orderData, orderType, orderSummary } = data;
    const brand = data.brandName || 'ChopShop';
    const paymentMethod = orderData.payment?.method || 'unknown';
    const paymentStatus = orderData.payment?.status || 'unknown';
    const paymentIntentId = orderData.payment?.paymentIntentId || '';
    const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
    // "Hantera order" deep-links into the MANAGED shop's admin order page
    // (?shopId= handled by the SPA), falling back to the orders list when the
    // ids are missing.
    const adminBase = app_urls_1.appUrls.ADMIN_BASE.replace(/\/$/, '');
    const adminPortalUrl = orderData.orderId && orderData.shopId
        ? `${adminBase}/admin/orders/${encodeURIComponent(orderData.orderId)}?shopId=${encodeURIComponent(orderData.shopId)}`
        : `${adminBase}/admin/orders`;
    if (orderType === 'B2B') {
        return generateB2BAdminTemplate(data, lang, brand, adminPortalUrl, orderSummary);
    }
    return generateB2CAdminTemplate(data, lang, brand, adminPortalUrl, paymentMethod, paymentStatus, paymentIntentId, affiliateCode);
}
exports.generateOrderNotificationAdminTemplate = generateOrderNotificationAdminTemplate;
// B2C Admin Template (Consumer order notification)
function generateB2CAdminTemplate(data, lang, brand, adminPortalUrl, paymentMethod, paymentStatus, paymentIntentId, affiliateCode) {
    const { orderData } = data;
    const ci = orderData.customerInfo;
    // Click & Collect: a pickup order shows "Upphämtning" (location + address +
    // date) instead of a shipping address that would otherwise read as bare "SE".
    const isPickup = orderData.deliveryMethod === 'pickup' && !!orderData.pickupLocation;
    const pu = orderData.pickupLocation;
    const shippingValue = orderData.shippingInfo
        ? `${(0, emailLayout_1.esc)(orderData.shippingInfo.address)}${orderData.shippingInfo.apartment ? ', ' + (0, emailLayout_1.esc)(orderData.shippingInfo.apartment) : ''}<br>${(0, emailLayout_1.esc)(orderData.shippingInfo.postalCode)} ${(0, emailLayout_1.esc)(orderData.shippingInfo.city)}<br>${(0, emailLayout_1.esc)(orderData.shippingInfo.country)}`
        : '';
    const pickupValue = isPickup
        ? `${(0, emailLayout_1.esc)(pu?.name || '')}${pu?.address ? '<br>' + (0, emailLayout_1.esc)(pu.address) : ''}${pu?.date ? '<br>Datum: ' + (0, emailLayout_1.esc)(pu.date) : ''}`
        : '';
    const customerPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderKeyValueRows)([
        { label: 'Ordernummer', value: (0, emailLayout_1.esc)(orderData.orderNumber) },
        { label: 'Kund', value: (0, emailLayout_1.esc)(`${ci.firstName || ''} ${ci.lastName || ''}`.trim()) || '-' },
        { label: 'E-post', value: `<a href="mailto:${(0, emailLayout_1.esc)(ci.email)}" style="color:${emailLayout_1.emailTokens.ink};text-decoration:underline;">${(0, emailLayout_1.esc)(ci.email)}</a>` },
        ...(isPickup
            ? [{ label: 'Upphämtning', value: pickupValue }]
            : shippingValue ? [{ label: 'Leveransadress', value: shippingValue }] : []),
    ], { rawHtml: true }), 'Kundinformation');
    const itemsPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderOrderRows)(orderData.items.map((item) => ({
        name: getCleanProductNameAdmin(item),
        meta: getPillsRowAdmin(item) || undefined,
        qtyLine: `${item.quantity} st × ${(0, config_1.formatPrice)(item.price)}`,
        amount: (0, config_1.formatPrice)(item.price * item.quantity),
    }))), 'Orderdetaljer');
    const totalsPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderTotals)([
        { label: 'Delsumma', value: (0, config_1.formatPrice)(orderData.subtotal || 0) },
        { label: isPickup ? 'Upphämtning' : 'Frakt', value: (0, config_1.formatPrice)(orderData.shipping || 0) },
        ...(orderData.discountAmount && orderData.discountAmount > 0
            ? [{ label: 'Rabatt', value: `-${(0, config_1.formatPrice)(orderData.discountAmount)}`, positive: true }]
            : []),
        { label: 'Moms (25%)', value: (0, config_1.formatPrice)(orderData.vat || 0) },
        { label: 'Totalt', value: (0, config_1.formatPrice)(orderData.total || 0), emphasis: true },
    ]), 'Ordersammanfattning');
    const paymentPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderKeyValueRows)([
        { label: 'Betalningsmetod', value: formatPaymentMethod(paymentMethod) },
        { label: 'Betalningsstatus', value: paymentStatus },
        ...(paymentIntentId ? [{ label: 'Payment Intent ID', value: paymentIntentId }] : []),
    ]), 'Betalningsinformation');
    const affiliatePanel = affiliateCode
        ? (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderKeyValueRows)([
            { label: 'Affiliate-kod', value: affiliateCode },
            ...(orderData.discountAmount && orderData.discountAmount > 0 ? [{ label: 'Rabatt tillämpad', value: (0, config_1.formatPrice)(orderData.discountAmount) }] : []),
        ]), 'Affiliate-information')
        : '';
    const body = (0, emailLayout_1.renderHeading)(`Ny beställning${orderData.source === 'b2c' ? ' (gäst)' : ''}`) +
        (0, emailLayout_1.renderParagraph)('En ny beställning har kommit in i butiken.', { muted: true }) +
        customerPanel +
        itemsPanel +
        totalsPanel +
        paymentPanel +
        affiliatePanel +
        (0, emailLayout_1.renderButton)(adminPortalUrl, 'Hantera order');
    const shopDomain = config_1.EMAIL_CONFIG.URLS.B2C_SHOP.replace(/^https?:\/\//, '');
    return {
        subject: `Ny beställning mottagen: ${orderData.orderNumber}`,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: `${brand} System`,
            bodyHtml: body,
            footerNote: `Beställningen gjordes i butiken på ${(0, emailLayout_1.esc)(shopDomain)}.`,
            preheader: `Ny beställning: ${(0, emailLayout_1.esc)(orderData.orderNumber)}`,
        }),
    };
}
// B2B Admin Template (Business order notification)
function generateB2BAdminTemplate(data, lang, brand, adminPortalUrl, orderSummary) {
    const { orderData } = data;
    const ci = orderData.customerInfo;
    const orderInfoPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderKeyValueRows)([
        { label: 'Ordernummer', value: orderData.orderNumber },
        { label: 'Skapad', value: orderData.createdAt || 'Just nu' },
        { label: 'Status', value: 'Ny – behöver behandling' },
    ]), 'Orderinformation');
    const customerPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderKeyValueRows)([
        { label: 'Företag', value: (0, emailLayout_1.esc)(ci.companyName || ci.name || '-') },
        { label: 'E-post', value: `<a href="mailto:${(0, emailLayout_1.esc)(ci.email)}" style="color:${emailLayout_1.emailTokens.ink};text-decoration:underline;">${(0, emailLayout_1.esc)(ci.email)}</a>` },
        { label: 'Kontaktperson', value: (0, emailLayout_1.esc)(ci.contactPerson || 'Ej angiven') },
        ...(ci.phone ? [{ label: 'Telefon', value: `<a href="tel:${(0, emailLayout_1.esc)(ci.phone)}" style="color:${emailLayout_1.emailTokens.ink};text-decoration:underline;">${(0, emailLayout_1.esc)(ci.phone)}</a>` }] : []),
        ...(ci.address ? [{ label: 'Adress', value: (0, emailLayout_1.esc)(`${ci.address}${ci.postalCode && ci.city ? `, ${ci.postalCode} ${ci.city}` : ''}`) }] : []),
        ...(ci.marginal ? [{ label: 'Kundmarginal', value: `${ci.marginal}%` }] : []),
    ], { rawHtml: true }), 'Kundinformation');
    const summaryPanel = (0, emailLayout_1.renderPanel)(`<div style="white-space:pre-line;color:${emailLayout_1.emailTokens.ink};line-height:1.5;font-family:'Courier New',monospace;font-size:13px;">${(0, emailLayout_1.esc)(orderSummary || 'Orderdetaljer saknas')}</div>`, 'Orderdetaljer');
    const totalPanel = (0, emailLayout_1.renderPanel)(`<div style="text-align:right;"><div style="font-size:20px;font-weight:700;color:${emailLayout_1.emailTokens.ink};font-variant-numeric:tabular-nums;">${(0, emailLayout_1.esc)((0, config_1.formatPrice)(orderData.total))}</div><div style="font-size:13px;color:${emailLayout_1.emailTokens.muted};margin-top:4px;">Inklusive kundens återförsäljarmarginal</div></div>`, 'Ordersammanfattning');
    const actionsPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderList)([
        'Granska orderdetaljer och kunduppgifter',
        'Bekräfta lagerstatus för alla produkter',
        'Uppdatera orderstatus till "Bekräftad" eller "Behandlas"',
        'Skicka orderbekräftelse till kunden',
        'Planera leverans och packning',
    ]), 'Åtgärder som behövs');
    const body = (0, emailLayout_1.renderHeading)('Ny företagsbeställning') +
        (0, emailLayout_1.renderParagraph)('En ny beställning har skapats i portalen och behöver behandling.', { muted: true }) +
        orderInfoPanel +
        customerPanel +
        summaryPanel +
        totalPanel +
        actionsPanel +
        (0, emailLayout_1.renderButton)(adminPortalUrl, 'Hantera order');
    return {
        subject: `Ny företagsbeställning: ${orderData.orderNumber} från ${ci.companyName || ci.name}`,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: `${brand} System`,
            bodyHtml: body,
            footerNote: 'Detta meddelande skickades automatiskt från orderhanteringen.',
            preheader: `Ny företagsbeställning: ${(0, emailLayout_1.esc)(orderData.orderNumber)}`,
        }),
    };
}
//# sourceMappingURL=orderNotificationAdmin.js.map