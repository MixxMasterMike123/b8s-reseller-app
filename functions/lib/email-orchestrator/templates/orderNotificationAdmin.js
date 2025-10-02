"use strict";
exports.__esModule = true;
exports.generateOrderNotificationAdminTemplate = void 0;
// Admin Order Notification Email Template
// Extracted from V3 Admin Templates - DESIGN PRESERVED + MOBILE OPTIMIZED
var config_1 = require("../core/config");
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
function getCleanProductNameAdmin(item) {
    return typeof item.name === 'object'
        ? (item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || JSON.stringify(item.name))
        : item.name || 'Unknown Product';
}
// Helper function to generate color pill HTML for admin emails
function getColorPillAdmin(item) {
    var color = getDisplayColor(item.color);
    if (!color || color === '-' || color === 'Blandade färger' || color === 'Mixed colors') {
        return '';
    }
    return "<span style=\"display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;\">F\u00E4rg: ".concat(color, "</span>");
}
// Helper function to generate size pill HTML for admin emails
function getSizePillAdmin(item) {
    var size = getDisplaySize(item.size);
    if (!size || size === '-' || size === 'Blandade storlekar' || size === 'Mixed sizes') {
        return '';
    }
    return "<span style=\"display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;\">Storlek: ".concat(size, "</span>");
}
// Helper function to generate pills row HTML for admin emails
function getPillsRowAdmin(item) {
    var colorPill = getColorPillAdmin(item);
    var sizePill = getSizePillAdmin(item);
    if (!colorPill && !sizePill) {
        return '';
    }
    return "<div style=\"margin-top: 6px; margin-bottom: 4px;\">".concat(colorPill).concat(sizePill, "</div>");
}
// DEPRECATED: Keep for backward compatibility but use pill design instead
// Helper function for admin product display names (currently unused but kept for future use)
// function getProductDisplayNameAdmin(item: any): string {
//   return getCleanProductNameAdmin(item);
// }
// Format payment method display
function formatPaymentMethod(method) {
    switch (method) {
        case 'stripe': return 'Stripe (Card/Klarna/Google Pay)';
        case 'mock_payment': return 'Test Payment';
        case 'swish': return 'Swish';
        case 'klarna': return 'Klarna';
        default: return method;
    }
}
function generateOrderNotificationAdminTemplate(data, lang) {
    var _a, _b, _c, _d;
    if (lang === void 0) { lang = 'sv-SE'; }
    var orderData = data.orderData, orderType = data.orderType, orderSummary = data.orderSummary;
    // Extract payment method information
    var paymentMethod = ((_a = orderData.payment) === null || _a === void 0 ? void 0 : _a.method) || 'unknown';
    var paymentStatus = ((_b = orderData.payment) === null || _b === void 0 ? void 0 : _b.status) || 'unknown';
    var paymentIntentId = ((_c = orderData.payment) === null || _c === void 0 ? void 0 : _c.paymentIntentId) || '';
    // Handle different affiliate data structures
    var affiliateCode = orderData.affiliateCode || ((_d = orderData.affiliate) === null || _d === void 0 ? void 0 : _d.code);
    // Admin portal URL
    var adminPortalUrl = "".concat(config_1.EMAIL_CONFIG.URLS.B2B_PORTAL, "/admin/orders");
    // Choose template based on order type
    if (orderType === 'B2B') {
        return generateB2BAdminTemplate(data, lang, adminPortalUrl, orderSummary);
    }
    else {
        return generateB2CAdminTemplate(data, lang, adminPortalUrl, paymentMethod, paymentStatus, paymentIntentId, affiliateCode);
    }
}
exports.generateOrderNotificationAdminTemplate = generateOrderNotificationAdminTemplate;
// B2C Admin Template (Consumer order notification)
function generateB2CAdminTemplate(data, lang, adminPortalUrl, paymentMethod, paymentStatus, paymentIntentId, affiliateCode) {
    var orderData = data.orderData;
    var templates = {
        'sv-SE': {
            subject: "Ny B2C-best\u00E4llning mottagen: ".concat(orderData.orderNumber),
            html: "<div style=\"font-family: ".concat(config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY, "; max-width: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH, "; margin: 0 auto; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, "; padding: 15px;\">\n  <div style=\"background-color: white; border-radius: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS, "; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n    <div style=\"text-align: center; margin-bottom: 25px;\">\n      <img src=\"").concat(config_1.EMAIL_CONFIG.URLS.LOGO_URL, "\" alt=\"B8Shield\" style=\"max-width: 180px; height: auto; display: block; margin: 0 auto;\">\n    </div>\n    \n    <h2 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-bottom: 20px; font-size: 22px; line-height: 1.3;\">Ny B2C ").concat(orderData.source === 'b2c' ? 'Gäst' : '', " Best\u00E4llning Mottagen</h2>\n    \n    <div style=\"background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;\">\n      <h3 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[KUND] KUNDINFORMATION:</h3>\n      <div style=\"font-size: 14px;\">\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Ordernummer:</strong> ").concat(orderData.orderNumber, "</p>\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Kund:</strong> ").concat(orderData.customerInfo.firstName || '', " ").concat(orderData.customerInfo.lastName || '', "</p>\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>E-post:</strong> <a href=\"mailto:").concat(orderData.customerInfo.email, "\" style=\"color: #2563eb; text-decoration: none;\">").concat(orderData.customerInfo.email, "</a></p>\n        ").concat(orderData.shippingInfo ? "\n        <p style=\"margin: 6px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Leveransadress:</strong><br>\n        ").concat(orderData.shippingInfo.address).concat(orderData.shippingInfo.apartment ? ', ' + orderData.shippingInfo.apartment : '', "<br>\n        ").concat(orderData.shippingInfo.postalCode, " ").concat(orderData.shippingInfo.city, "<br>\n        ").concat(orderData.shippingInfo.country, "</p>\n        ") : '', "\n      </div>\n    </div>\n\n    <div style=\"background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;\">\n      <h3 style=\"color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[PRODUKTER] ORDERDETALJER:</h3>\n      <div style=\"background-color: white; border-radius: 4px; padding: 10px;\">\n        ").concat(orderData.items.map(function (item) { return "\n          <div style=\"display: block; padding: 10px 0; border-bottom: 1px solid #d1fae5;\">\n            <div style=\"margin-bottom: 8px;\">\n              <div style=\"font-weight: bold; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 15px; margin-bottom: 2px;\">").concat(getCleanProductNameAdmin(item), "</div>\n              ").concat(getPillsRowAdmin(item), "\n              <div style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; font-size: 13px;\">").concat(item.quantity, " st \u00D7 ").concat((0, config_1.formatPrice)(item.price), "</div>\n            </div>\n            <div style=\"text-align: right;\">\n              <div style=\"font-weight: bold; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 16px;\">").concat((0, config_1.formatPrice)(item.price * item.quantity), "</div>\n            </div>\n          </div>\n        "); }).join(''), "\n      </div>\n    </div>\n\n    <div style=\"background-color: #fef3c7; border-left: 4px solid ").concat(config_1.EMAIL_CONFIG.COLORS.WARNING, "; padding: 15px; margin-bottom: 20px;\">\n      <h3 style=\"color: #92400e; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[SAMMANFATTNING] ORDERSAMMANFATTNING:</h3>\n      <div style=\"background-color: white; border-radius: 4px; padding: 12px;\">\n        <table style=\"width: 100%; border-collapse: collapse; font-size: 14px;\">\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; padding: 3px 0;\">Delsumma:</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; font-weight: bold; text-align: right; padding: 3px 0;\">").concat((0, config_1.formatPrice)(orderData.subtotal || 0), "</td></tr>\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; padding: 3px 0;\">Frakt:</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; font-weight: bold; text-align: right; padding: 3px 0;\">").concat((0, config_1.formatPrice)(orderData.shipping || 0), "</td></tr>\n          ").concat(orderData.discountAmount && orderData.discountAmount > 0 ? "<tr><td style=\"color: ".concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, "; padding: 3px 0;\">Rabatt:</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, "; font-weight: bold; text-align: right; padding: 3px 0;\">-").concat((0, config_1.formatPrice)(orderData.discountAmount), "</td></tr>") : '', "\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; padding: 3px 0;\">Moms (25%):</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; font-weight: bold; text-align: right; padding: 3px 0;\">").concat((0, config_1.formatPrice)(orderData.vat || 0), "</td></tr>\n          <tr><td colspan=\"2\" style=\"border-top: 2px solid ").concat(config_1.EMAIL_CONFIG.COLORS.WARNING, "; padding: 10px 0 0 0;\"></td></tr>\n          <tr><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 16px; font-weight: bold; padding: 3px 0;\">TOTALT:</td><td style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; font-size: 16px; font-weight: bold; text-align: right; padding: 3px 0;\">").concat((0, config_1.formatPrice)(orderData.total || 0), "</td></tr>\n        </table>\n      </div>\n    </div>\n\n    <div style=\"background-color: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;\">\n      <h3 style=\"color: #1e40af; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[BETALNING] BETALNINGSINFORMATION:</h3>\n      <div style=\"font-size: 14px;\">\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Betalningsmetod:</strong> ").concat(formatPaymentMethod(paymentMethod), "</p>\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Betalningsstatus:</strong> ").concat(paymentStatus, "</p>\n        ").concat(paymentIntentId ? "<p style=\"margin: 6px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Payment Intent ID:</strong> ").concat(paymentIntentId, "</p>") : '', "\n      </div>\n    </div>\n\n    ").concat(affiliateCode ? "\n    <div style=\"background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;\">\n      <h3 style=\"color: #0369a1; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[AFFILIATE] AFFILIATE-INFORMATION:</h3>\n      <div style=\"font-size: 14px;\">\n        <p style=\"margin: 6px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Affiliate-kod:</strong> ").concat(affiliateCode, "</p>\n        ").concat(orderData.discountAmount && orderData.discountAmount > 0 ? "<p style=\"margin: 6px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Rabatt till\u00E4mpad:</strong> ").concat((0, config_1.formatPrice)(orderData.discountAmount), "</p>") : '', "\n      </div>\n    </div>\n    ") : '', "\n    \n    <div style=\"text-align: center; margin: 25px 0;\">\n      <a href=\"").concat(adminPortalUrl, "\" style=\"display: inline-block; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, "; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, ";\">Hantera order</a>\n    </div>\n    \n    <div style=\"border-top: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, "; padding-top: 15px; margin-top: 25px; text-align: center;\">\n      <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; font-size: 13px; margin: 0;\">Denna best\u00E4llning gjordes p\u00E5 B2C-butiken p\u00E5 shop.b8shield.com<br><strong>B8Shield Admin Notification</strong></p>\n    </div>\n  </div>\n</div>")
        },
        'en-GB': {
            subject: "New B2C Order Received: ".concat(orderData.orderNumber),
            html: "<div>English B2C Admin Template</div>"
        },
        'en-US': {
            subject: "New B2C Order Received: ".concat(orderData.orderNumber),
            html: "<div>US English B2C Admin Template</div>"
        }
    };
    var template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
// B2B Admin Template (Business order notification)
function generateB2BAdminTemplate(data, lang, adminPortalUrl, orderSummary) {
    var orderData = data.orderData;
    var templates = {
        'sv-SE': {
            subject: "Ny B2B-best\u00E4llning: ".concat(orderData.orderNumber, " fr\u00E5n ").concat(orderData.customerInfo.companyName || orderData.customerInfo.name),
            html: "<div style=\"font-family: ".concat(config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY, "; max-width: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH, "; margin: 0 auto; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, "; padding: 15px;\">\n  <div style=\"background-color: white; border-radius: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS, "; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n    <div style=\"text-align: center; margin-bottom: 25px;\">\n      <img src=\"").concat(config_1.EMAIL_CONFIG.URLS.LOGO_URL, "\" alt=\"B8Shield\" style=\"max-width: 180px; height: auto; display: block; margin: 0 auto;\">\n    </div>\n    \n    <h2 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-bottom: 20px; font-size: 22px; line-height: 1.3;\">Ny B2B-best\u00E4llning mottagen</h2>\n    <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; line-height: 1.6; margin-bottom: 20px; font-size: 14px;\">En ny best\u00E4llning har skapats i B2B-portalen och beh\u00F6ver behandling.</p>\n    \n    <div style=\"background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin-bottom: 20px;\">\n      <h3 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[ORDER] ORDERINFORMATION:</h3>\n      <div style=\"font-size: 14px;\">\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Ordernummer:</strong> ").concat(orderData.orderNumber, "</p>\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Skapad:</strong> ").concat(orderData.createdAt || 'Just nu', "</p>\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Status:</strong> <span style=\"color: #2563eb; font-weight: bold;\">Ny - Beh\u00F6ver behandling</span></p>\n      </div>\n    </div>\n    \n    <div style=\"background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;\">\n      <h3 style=\"color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[KUND] KUNDINFORMATION:</h3>\n      <div style=\"background-color: white; border-radius: 4px; padding: 12px; font-size: 14px;\">\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>F\u00F6retag:</strong> ").concat(orderData.customerInfo.companyName || orderData.customerInfo.name, "</p>\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>E-post:</strong> <a href=\"mailto:").concat(orderData.customerInfo.email, "\" style=\"color: #2563eb; text-decoration: none;\">").concat(orderData.customerInfo.email, "</a></p>\n        <p style=\"margin: 6px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Kontaktperson:</strong> ").concat(orderData.customerInfo.contactPerson || 'Ej angiven', "</p>\n        ").concat(orderData.customerInfo.phone ? "<p style=\"margin: 6px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Telefon:</strong> <a href=\"tel:").concat(orderData.customerInfo.phone, "\" style=\"color: #2563eb; text-decoration: none;\">").concat(orderData.customerInfo.phone, "</a></p>") : '', "\n        ").concat(orderData.customerInfo.address ? "<p style=\"margin: 6px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Adress:</strong> ").concat(orderData.customerInfo.address).concat(orderData.customerInfo.postalCode && orderData.customerInfo.city ? ", ".concat(orderData.customerInfo.postalCode, " ").concat(orderData.customerInfo.city) : '', "</p>") : '', "\n        ").concat(orderData.customerInfo.marginal ? "<p style=\"margin: 6px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Kundmarginal:</strong> ").concat(orderData.customerInfo.marginal, "%</p>") : '', "\n      </div>\n    </div>\n    \n    <div style=\"background-color: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;\">\n      <h3 style=\"color: #1e40af; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[BEST\u00C4LLNING] ORDERDETALJER:</h3>\n      <div style=\"background-color: white; border-radius: 4px; padding: 12px;\">\n        <div style=\"white-space: pre-line; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; line-height: 1.5; font-family: monospace; font-size: 13px;\">").concat(orderSummary || 'Orderdetaljer saknas', "</div>\n      </div>\n    </div>\n    \n    <div style=\"background-color: #fef3c7; border-left: 4px solid ").concat(config_1.EMAIL_CONFIG.COLORS.WARNING, "; padding: 15px; margin-bottom: 20px;\">\n      <h3 style=\"color: #92400e; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[TOTALT] ORDERSAMMANFATTNING:</h3>\n      <div style=\"background-color: white; border-radius: 4px; padding: 12px;\">\n        <div style=\"text-align: right;\">\n          <div style=\"font-size: 20px; font-weight: bold; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, ";\">").concat((0, config_1.formatPrice)(orderData.total), "</div>\n          <div style=\"font-size: 13px; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; margin-top: 4px;\">Inklusive kundens \u00E5terf\u00F6rs\u00E4ljarmarginal</div>\n        </div>\n      </div>\n    </div>\n    \n    <div style=\"background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;\">\n      <h3 style=\"color: #dc2626; margin-top: 0; margin-bottom: 12px; font-size: 16px;\">[\u00C5TG\u00C4RD] \u00C5TG\u00C4RDER BEH\u00D6VS:</h3>\n      <ol style=\"color: #dc2626; margin: 0; padding-left: 18px; line-height: 1.5; font-size: 14px;\">\n        <li>Granska orderdetaljer och kunduppgifter</li>\n        <li>Bekr\u00E4fta lagerstatus f\u00F6r alla produkter</li>\n        <li>Uppdatera orderstatus till \"Bekr\u00E4ftad\" eller \"Behandlas\"</li>\n        <li>Skicka orderbekr\u00E4ftelse till kunden</li>\n        <li>Planera leverans och packning</li>\n      </ol>\n    </div>\n    \n    <div style=\"text-align: center; margin: 25px 0;\">\n      <a href=\"").concat(adminPortalUrl, "\" style=\"display: inline-block; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, "; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, ";\">Hantera order</a>\n    </div>\n    \n    <div style=\"border-top: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, "; padding-top: 15px; margin-top: 25px; text-align: center;\">\n      <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; font-size: 13px; margin: 0;\">B8Shield Admin Notification<br><strong>B2B Orderhantering</strong><br>JPH Innovation AB</p>\n    </div>\n  </div>\n</div>")
        },
        'en-GB': {
            subject: "New B2B Order: ".concat(orderData.orderNumber, " from ").concat(orderData.customerInfo.companyName || orderData.customerInfo.name),
            html: "<div>English B2B Admin Template</div>"
        },
        'en-US': {
            subject: "New B2B Order: ".concat(orderData.orderNumber, " from ").concat(orderData.customerInfo.companyName || orderData.customerInfo.name),
            html: "<div>US English B2B Admin Template</div>"
        }
    };
    var template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
