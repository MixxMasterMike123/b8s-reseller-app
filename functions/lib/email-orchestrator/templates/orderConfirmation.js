"use strict";
exports.__esModule = true;
exports.generateOrderConfirmationTemplate = void 0;
// Order Confirmation Email Template
// Extracted from V3 B2C Order Pending Template - DESIGN PRESERVED
var config_1 = require("../core/config");
// Helper function to get product name from multilingual object
function getProductName(item, lang) {
    if (typeof item.name === 'object') {
        return item.name[lang] || item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'Okänd produkt';
    }
    return item.name || 'Okänd produkt';
}
// Helper function to format size for display (replicates frontend getDisplaySize logic)
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
// Helper function to format color for display (replicates frontend getDisplayColor logic)
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
// Helper function to get clean product name without color/size (for pill design)
function getCleanProductName(item, lang) {
    return getProductName(item, lang);
}
// Helper function to generate color pill HTML
function getColorPill(item) {
    var color = getDisplayColor(item.color);
    if (!color || color === '-' || color === 'Blandade färger' || color === 'Mixed colors') {
        return '';
    }
    return "<span style=\"display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;\">F\u00E4rg: ".concat(color, "</span>");
}
// Helper function to generate size pill HTML
function getSizePill(item, lang) {
    var size = getDisplaySize(item.size);
    if (!size || size === '-' || size === 'Blandade storlekar' || size === 'Mixed sizes') {
        return '';
    }
    var sizeLabel = lang.startsWith('en') ? 'Size' : 'Storlek';
    return "<span style=\"display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;\">".concat(sizeLabel, ": ").concat(size, "</span>");
}
// Helper function to generate pills row HTML
function getPillsRow(item, lang) {
    var colorPill = getColorPill(item);
    var sizePill = getSizePill(item, lang);
    if (!colorPill && !sizePill) {
        return '';
    }
    return "<div style=\"margin-top: 6px; margin-bottom: 4px;\">".concat(colorPill).concat(sizePill, "</div>");
}
// DEPRECATED: Keep for backward compatibility but use pill design instead
// Helper function for product display names (currently unused but kept for future use)
// function getProductDisplayName(item: any, lang: string): string {
//   return getCleanProductName(item, lang);
// }
function generateOrderConfirmationTemplate(data, lang, orderId) {
    var _a;
    if (lang === void 0) { lang = 'sv-SE'; }
    var orderData = data.orderData, customerInfo = data.customerInfo, orderType = data.orderType;
    // Handle different affiliate data structures (Stripe vs Mock payments)
    var affiliateCode = orderData.affiliateCode || ((_a = orderData.affiliate) === null || _a === void 0 ? void 0 : _a.code);
    var customerName = customerInfo.firstName + (customerInfo.lastName ? ' ' + customerInfo.lastName : '') || customerInfo.name || 'Kund';
    // Generate URLs - USE ORDER DB ID NOT ORDER NUMBER (same pattern as status update)
    var finalOrderId = orderId || data.orderId;
    var orderUrl = (0, config_1.getOrderTrackingUrl)(finalOrderId, lang);
    var supportUrl = (0, config_1.getSupportUrl)(lang);
    // Choose template based on order type
    if (orderType === 'B2B') {
        return generateB2BTemplate(data, lang, customerName, orderUrl, supportUrl);
    }
    else {
        return generateB2CTemplate(data, lang, customerName, orderUrl, supportUrl, affiliateCode);
    }
}
exports.generateOrderConfirmationTemplate = generateOrderConfirmationTemplate;
// B2C Template (Consumer-focused)
function generateB2CTemplate(data, lang, customerName, orderUrl, supportUrl, affiliateCode) {
    var orderData = data.orderData, customerInfo = data.customerInfo;
    var orderNumber = orderData.orderNumber, items = orderData.items, subtotal = orderData.subtotal, shipping = orderData.shipping, vat = orderData.vat, total = orderData.total, _a = orderData.discountAmount, discountAmount = _a === void 0 ? 0 : _a;
    var templates = {
        'sv-SE': {
            subject: "Tack f\u00F6r din best\u00E4llning, ".concat(customerName, "! (Order ").concat(orderNumber, ")"),
            html: "<div style=\"font-family: ".concat(config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY, "; max-width: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH, "; margin: 0 auto; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, "; padding: 15px;\">\n  <div style=\"background-color: white; border-radius: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS, "; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n    <div style=\"text-align: center; margin-bottom: 25px;\">\n      <img src=\"").concat(config_1.EMAIL_CONFIG.URLS.LOGO_URL, "\" alt=\"B8Shield\" style=\"max-width: 180px; height: auto; display: block; margin: 0 auto;\">\n    </div>\n    <h2 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-bottom: 20px; font-size: 20px; line-height: 1.3;\">Hej ").concat(customerName, ",</h2>\n    <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; line-height: 1.6; margin-bottom: 20px;\">Tack f\u00F6r din best\u00E4llning fr\u00E5n B8Shield! Vi har mottagit din order och kommer att behandla den snarast.</p>\n    <div style=\"background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;\">\n      <h3 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-top: 0; margin-bottom: 15px;\">[ORDER] ORDERDETALJER:</h3>\n      <p style=\"margin: 8px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Ordernummer:</strong> ").concat(orderNumber, "</p>\n      <p style=\"margin: 8px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Status:</strong> <span style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, "; font-weight: bold;\">Mottagen</span></p>\n      <p style=\"margin: 8px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>E-post:</strong> ").concat(customerInfo.email, "</p>\n    </div>\n    <div style=\"background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;\">\n      <h4 style=\"color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;\">[PRODUKTER] DINA PRODUKTER:</h4>\n      <div style=\"background-color: white; border-radius: 4px; padding: 10px;\">\n        ").concat(items.map(function (item) { return "\n          <div style=\"display: flex; flex-direction: column; border-bottom: 1px solid ".concat(config_1.EMAIL_CONFIG.COLORS.BORDER, "; padding: 15px 0; margin-bottom: 10px;\">\n            <div style=\"display: flex; align-items: flex-start; margin-bottom: 8px;\">\n              ").concat(item.image ? "\n              <div style=\"flex-shrink: 0; margin-right: 12px;\">\n                <img src=\"".concat(item.image, "\" alt=\"").concat(getCleanProductName(item, lang), "\" style=\"width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, "; display: block;\" />\n              </div>\n              ") : '', "\n              <div style=\"flex: 1; min-width: 0;\">\n                <div style=\"font-weight: bold; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 16px; line-height: 1.4; margin-bottom: 2px;\">").concat(getCleanProductName(item, lang), "</div>\n                ").concat(getPillsRow(item, lang), "\n                <div style=\"font-size: 14px; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; margin-bottom: 8px;\">Kvantitet: ").concat(item.quantity, " st \u00D7 ").concat((0, config_1.formatPrice)(item.price), "</div>\n              </div>\n            </div>\n            <div style=\"text-align: right; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, "; padding: 8px 12px; border-radius: 4px;\">\n              <div style=\"font-weight: bold; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 18px;\">").concat((0, config_1.formatPrice)(item.price * item.quantity), "</div>\n            </div>\n          </div>\n        "); }).join(''), "\n      </div>\n    </div>\n    <div style=\"background-color: #fef3c7; border-left: 4px solid ").concat(config_1.EMAIL_CONFIG.COLORS.WARNING, "; padding: 15px; margin-bottom: 25px;\">\n      <h4 style=\"color: #92400e; margin-top: 0; margin-bottom: 15px;\">[SAMMANFATTNING] ORDERSAMMANFATTNING:</h4>\n      <div style=\"background-color: white; border-radius: 4px; padding: 15px;\">\n        <table style=\"width: 100%; border-collapse: collapse;\">\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; padding: 4px 0;\">Delsumma:</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; font-weight: bold; text-align: right; padding: 4px 0;\">").concat((0, config_1.formatPrice)(subtotal), "</td></tr>\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; padding: 4px 0;\">Frakt:</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; font-weight: bold; text-align: right; padding: 4px 0;\">").concat((0, config_1.formatPrice)(shipping), "</td></tr>\n          ").concat(discountAmount > 0 ? "<tr><td style=\"color: ".concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, "; padding: 4px 0;\">Rabatt ").concat(affiliateCode ? '(' + affiliateCode + ')' : '', ":</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, "; font-weight: bold; text-align: right; padding: 4px 0;\">-").concat((0, config_1.formatPrice)(discountAmount), "</td></tr>") : '', "\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; padding: 4px 0;\">Moms (25%):</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; font-weight: bold; text-align: right; padding: 4px 0;\">").concat((0, config_1.formatPrice)(vat), "</td></tr>\n          <tr><td colspan=\"2\" style=\"border-top: 2px solid ").concat(config_1.EMAIL_CONFIG.COLORS.WARNING, "; padding: 15px 0 0 0;\"></td></tr>\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 18px; font-weight: bold; padding: 4px 0;\">TOTALT:</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;\">").concat((0, config_1.formatPrice)(total), "</td></tr>\n        </table>\n      </div>\n    </div>\n    <div style=\"text-align: center; margin: 30px 0;\">\n      <a href=\"").concat(orderUrl, "\" style=\"display: inline-block; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, "; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, ";\">F\u00F6lj din order</a>\n    </div>\n    <div style=\"border-top: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, "; padding-top: 20px; margin-top: 30px;\">\n      <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; font-size: 14px; margin: 0;\">Med v\u00E4nliga h\u00E4lsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>\n    </div>\n  </div>\n</div>")
        },
        'en-GB': {
            subject: "Thank you for your order, ".concat(customerName, "! (Order ").concat(orderNumber, ")"),
            html: "<div>English B2C template</div>"
        },
        'en-US': {
            subject: "Thank you for your order, ".concat(customerName, "! (Order ").concat(orderNumber, ")"),
            html: "<div>US English B2C template</div>"
        }
    };
    var template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
// B2B Template (Business-focused)
function generateB2BTemplate(data, lang, customerName, orderUrl, supportUrl) {
    var orderData = data.orderData;
    var orderNumber = orderData.orderNumber, total = orderData.total;
    var templates = {
        'sv-SE': {
            subject: "Orderbekr\u00E4ftelse: ".concat(orderNumber),
            html: "<div style=\"font-family: ".concat(config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY, "; max-width: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH, "; margin: 0 auto; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, "; padding: 20px;\">\n  <div style=\"background-color: white; border-radius: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS, "; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n    <div style=\"text-align: center; margin-bottom: 30px;\">\n      <img src=\"").concat(config_1.EMAIL_CONFIG.URLS.LOGO_URL, "\" alt=\"B8Shield\" style=\"max-width: 200px; height: auto;\">\n    </div>\n    <h2 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-bottom: 20px;\">Orderbekr\u00E4ftelse</h2>\n    <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; line-height: 1.6; margin-bottom: 20px;\">Hej ").concat(customerName, ",</p>\n    <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; line-height: 1.6; margin-bottom: 25px;\">Tack f\u00F6r din best\u00E4llning! Vi har mottagit din order och kommer att behandla den snarast.</p>\n    <div style=\"background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;\">\n      <h3 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-top: 0; margin-bottom: 15px;\">[ORDER] ORDERDETALJER:</h3>\n      <p style=\"margin: 8px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Ordernummer:</strong> ").concat(orderNumber, "</p>\n      <p style=\"margin: 8px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>F\u00F6retag:</strong> ").concat(customerName, "</p>\n    </div>\n    <div style=\"background-color: #fef3c7; border-left: 4px solid ").concat(config_1.EMAIL_CONFIG.COLORS.WARNING, "; padding: 20px; margin-bottom: 25px;\">\n      <h3 style=\"color: #92400e; margin-top: 0; margin-bottom: 15px;\">[TOTALT] ORDERSAMMANFATTNING:</h3>\n      <div style=\"background-color: white; border-radius: 4px; padding: 15px;\">\n        <div style=\"text-align: right;\">\n          <div style=\"font-size: 24px; font-weight: bold; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, ";\">").concat((0, config_1.formatPrice)(total), "</div>\n          <div style=\"font-size: 14px; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; margin-top: 4px;\">Inklusive din \u00E5terf\u00F6rs\u00E4ljarmarginal</div>\n        </div>\n      </div>\n    </div>\n    <div style=\"text-align: center; margin: 30px 0;\">\n      <a href=\"").concat(config_1.EMAIL_CONFIG.URLS.B2B_PORTAL, "\" style=\"display: inline-block; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, "; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, ";\">G\u00E5 till portalen</a>\n    </div>\n    <div style=\"border-top: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, "; padding-top: 20px; margin-top: 30px;\">\n      <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; font-size: 14px; margin: 0;\">Med v\u00E4nliga h\u00E4lsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>\n    </div>\n  </div>\n</div>")
        },
        'en-GB': {
            subject: "Order Confirmation: ".concat(orderNumber),
            html: "<div>English B2B template</div>"
        },
        'en-US': {
            subject: "Order Confirmation: ".concat(orderNumber),
            html: "<div>US English B2B template</div>"
        }
    };
    var template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
