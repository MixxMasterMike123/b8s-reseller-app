"use strict";
exports.__esModule = true;
exports.generateOrderStatusUpdateTemplate = void 0;
// Order Status Update Email Template
// Extracted from V3 orderStatusUpdate template - DESIGN PRESERVED
var config_1 = require("../core/config");
// Helper function to get status display info
function getStatusInfo(status, lang) {
    var statusMap = {
        'sv-SE': {
            'pending': { name: 'Väntande', color: '#6b7280', icon: '⏳' },
            'confirmed': { name: 'Bekräftad', color: '#059669', icon: '✅' },
            'processing': { name: 'Behandlas', color: '#2563eb', icon: '⚙️' },
            'shipped': { name: 'Skickad', color: '#7c3aed', icon: '📦' },
            'delivered': { name: 'Levererad', color: '#059669', icon: '🎉' },
            'cancelled': { name: 'Avbruten', color: '#dc2626', icon: '❌' }
        },
        'en-GB': {
            'pending': { name: 'Pending', color: '#6b7280', icon: '⏳' },
            'confirmed': { name: 'Confirmed', color: '#059669', icon: '✅' },
            'processing': { name: 'Processing', color: '#2563eb', icon: '⚙️' },
            'shipped': { name: 'Shipped', color: '#7c3aed', icon: '📦' },
            'delivered': { name: 'Delivered', color: '#059669', icon: '🎉' },
            'cancelled': { name: 'Cancelled', color: '#dc2626', icon: '❌' }
        },
        'en-US': {
            'pending': { name: 'Pending', color: '#6b7280', icon: '⏳' },
            'confirmed': { name: 'Confirmed', color: '#059669', icon: '✅' },
            'processing': { name: 'Processing', color: '#2563eb', icon: '⚙️' },
            'shipped': { name: 'Shipped', color: '#7c3aed', icon: '📦' },
            'delivered': { name: 'Delivered', color: '#059669', icon: '🎉' },
            'cancelled': { name: 'Canceled', color: '#dc2626', icon: '❌' }
        }
    };
    var langMap = statusMap[lang] || statusMap['sv-SE'];
    return langMap[status] || { name: status, color: '#6b7280', icon: '📋' };
}
// Helper function to get next steps based on status
function getNextSteps(status, lang) {
    var nextStepsMap = {
        'sv-SE': {
            'confirmed': [
                'Vi förbereder din beställning för behandling',
                'Du får en uppdatering när vi börjar behandla ordern',
                'Beräknad behandlingstid: 1-2 arbetsdagar'
            ],
            'processing': [
                'Din order behandlas och förbereds för leverans',
                'Alla produkter kontrolleras och packas noggrant'
            ],
            'shipped': [
                'Din order är nu på väg till dig',
                'Använd spårningsnumret för att följa leveransen',
                'Kontakta oss om du har frågor om leveransen'
            ],
            'delivered': [
                'Din beställning har levererats framgångsrikt',
                'Vi hoppas du är nöjd med ditt köp',
                'Kontakta oss om du behöver support eller har frågor'
            ],
            'cancelled': [
                'Din beställning har avbrutits',
                'Om betalning har genomförts kommer återbetalning att ske inom 3-5 arbetsdagar',
                'Kontakta vår support om du har frågor'
            ]
        },
        'en-GB': {
            'confirmed': [
                'We are preparing your order for processing',
                'You will receive an update when we start processing your order',
                'Estimated processing time: 1-2 business days'
            ],
            'processing': [
                'Your order is being processed and prepared for shipment',
                'All products are being checked and carefully packed',
                'You will receive tracking information once your order ships'
            ],
            'shipped': [
                'Your order is now on its way to you',
                'Use the tracking number to follow your delivery',
                'Contact us if you have any questions about the delivery'
            ],
            'delivered': [
                'Your order has been successfully delivered',
                'We hope you are satisfied with your purchase',
                'Contact us if you need support or have any questions'
            ],
            'cancelled': [
                'Your order has been cancelled',
                'If payment has been processed, refund will occur within 3-5 business days',
                'Contact our support if you have any questions'
            ]
        }
    };
    var langMap = nextStepsMap[lang] || nextStepsMap['sv-SE'];
    return langMap[status] || ['Kontakta oss för mer information'];
}
function generateOrderStatusUpdateTemplate(data, lang, orderId) {
    if (lang === void 0) { lang = 'sv-SE'; }
    var orderData = data.orderData, userData = data.userData, newStatus = data.newStatus, previousStatus = data.previousStatus, trackingNumber = data.trackingNumber, estimatedDelivery = data.estimatedDelivery, notes = data.notes;
    var orderNumber = orderData.orderNumber;
    // Ensure all required fields are present and valid
    if (!(orderData === null || orderData === void 0 ? void 0 : orderData.orderNumber) || !(userData === null || userData === void 0 ? void 0 : userData.email) || !newStatus) {
        throw new Error('Missing required data for order status update template');
    }
    var contactPerson = userData.contactPerson || userData.companyName || '';
    var statusInfo = getStatusInfo(newStatus, lang);
    var nextSteps = getNextSteps(newStatus, lang);
    var supportUrl = (0, config_1.getSupportUrl)(lang);
    // Ensure statusInfo has valid properties
    if (!statusInfo || !statusInfo.name) {
        throw new Error("Invalid status: ".concat(newStatus));
    }
    var templates = {
        'sv-SE': {
            subject: "Orderuppdatering: ".concat(orderNumber, " - ").concat(statusInfo.name),
            html: "\n<div style=\"font-family: ".concat(config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY, "; max-width: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH, "; margin: 0 auto; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, "; padding: 15px;\">\n  <div style=\"background-color: white; border-radius: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS, "; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n    <div style=\"text-align: center; margin-bottom: 25px;\">\n      <img src=\"").concat(config_1.EMAIL_CONFIG.URLS.LOGO_URL, "\" alt=\"B8Shield\" style=\"max-width: 180px; height: auto; display: block; margin: 0 auto;\">\n    </div>\n    \n    <h2 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-bottom: 20px; font-size: 20px; line-height: 1.3;\">Hej ").concat(contactPerson, ",</h2>\n    <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; line-height: 1.6; margin-bottom: 20px;\">Vi har en uppdatering om din best\u00E4llning fr\u00E5n B8Shield.</p>\n    \n    <div style=\"background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;\">\n      <h3 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, "; margin-top: 0; margin-bottom: 15px;\">[ORDER] ORDERDETALJER:</h3>\n      <p style=\"margin: 8px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Ordernummer:</strong> ").concat(orderNumber, "</p>\n      <p style=\"margin: 8px 0; color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\"><strong>Ny status:</strong> <span style=\"color: ").concat(statusInfo.color, "; font-weight: bold;\">").concat(statusInfo.name, "</span></p>\n      ").concat(previousStatus ? "<p style=\"margin: 8px 0; color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; font-size: 14px;\"><strong>Tidigare status:</strong> ").concat(getStatusInfo(previousStatus, lang).name, "</p>") : '', "\n    </div>\n\n    ").concat(trackingNumber ? "\n    <div style=\"background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;\">\n      <h4 style=\"color: #065f46; margin-top: 0; margin-bottom: 10px;\">[SP\u00C5RNING] SP\u00C5RNINGSINFORMATION:</h4>\n      <p style=\"color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; margin: 0;\"><strong>Sp\u00E5rningsnummer:</strong> ").concat(trackingNumber, "</p>\n      ").concat(estimatedDelivery ? "<p style=\"color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; margin: 5px 0 0 0;\"><strong>Ber\u00E4knad leverans:</strong> ").concat(estimatedDelivery, "</p>") : '', "\n    </div>\n    ") : '', "\n\n    <div style=\"background-color: #fef3c7; border-left: 4px solid ").concat(config_1.EMAIL_CONFIG.COLORS.WARNING, "; padding: 15px; margin-bottom: 25px;\">\n      <h4 style=\"color: #92400e; margin-top: 0; margin-bottom: 15px;\">[N\u00C4STA STEG] VAD H\u00C4NDER NU?</h4>\n      <ul style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; margin: 0; padding-left: 20px;\">\n        ").concat(nextSteps.map(function (step) { return "<li style=\"margin-bottom: 8px;\">".concat(step, "</li>"); }).join(''), "\n      </ul>\n    </div>\n\n    ").concat(notes ? "\n    <div style=\"background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;\">\n      <h4 style=\"color: ".concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; margin-top: 0; margin-bottom: 10px;\">[ANTECKNINGAR] YTTERLIGARE INFORMATION:</h4>\n      <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; margin: 0; font-style: italic;\">").concat(notes, "</p>\n    </div>\n    ") : '', "\n\n    <div style=\"text-align: center; margin: 30px 0;\">\n      <a href=\"").concat((0, config_1.getOrderTrackingUrl)(orderId || orderNumber, 'sv-SE'), "\" style=\"display: inline-block; background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, "; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, ";\">Visa orderdetaljer</a>\n    </div>\n\n    <div style=\"background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;\">\n      <h4 style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, "; margin-top: 0; margin-bottom: 10px;\">[SUPPORT] BEH\u00D6VER DU HJ\u00C4LP?</h4>\n      <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; margin: 0; font-size: 14px;\">Om du har n\u00E5gra fr\u00E5gor om din best\u00E4llning, kontakta v\u00E5r support p\u00E5 <a href=\"").concat(supportUrl, "\" style=\"color: #2563eb;\">").concat(supportUrl, "</a></p>\n    </div>\n    \n    <div style=\"border-top: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, "; padding-top: 20px; margin-top: 30px;\">\n      <p style=\"color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, "; font-size: 14px; margin: 0;\">Med v\u00E4nliga h\u00E4lsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>\n    </div>\n  </div>\n</div>")
        }
    };
    var template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
exports.generateOrderStatusUpdateTemplate = generateOrderStatusUpdateTemplate;
