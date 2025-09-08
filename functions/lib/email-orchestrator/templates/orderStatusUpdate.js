"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderStatusUpdateTemplate = void 0;
// Order Status Update Email Template
// Extracted from V3 orderStatusUpdate template - DESIGN PRESERVED
const config_1 = require("../core/config");
// Helper function to get status display info
function getStatusInfo(status, lang) {
    const statusMap = {
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
    const langMap = statusMap[lang] || statusMap['sv-SE'];
    return langMap[status] || { name: status, color: '#6b7280', icon: '📋' };
}
// Helper function to get next steps based on status
function getNextSteps(status, lang) {
    const nextStepsMap = {
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
    const langMap = nextStepsMap[lang] || nextStepsMap['sv-SE'];
    return langMap[status] || ['Kontakta oss för mer information'];
}
function generateOrderStatusUpdateTemplate(data, lang = 'sv-SE', orderId) {
    const { orderData, userData, newStatus, previousStatus, trackingNumber, estimatedDelivery, notes } = data;
    const { orderNumber } = orderData;
    // Ensure all required fields are present and valid
    if (!orderData?.orderNumber || !userData?.email || !newStatus) {
        throw new Error('Missing required data for order status update template');
    }
    const contactPerson = userData.contactPerson || userData.companyName || '';
    const statusInfo = getStatusInfo(newStatus, lang);
    const nextSteps = getNextSteps(newStatus, lang);
    const supportUrl = (0, config_1.getSupportUrl)(lang);
    // Ensure statusInfo has valid properties
    if (!statusInfo || !statusInfo.name) {
        throw new Error(`Invalid status: ${newStatus}`);
    }
    const templates = {
        'sv-SE': {
            subject: `Orderuppdatering: ${orderNumber} - ${statusInfo.name}`,
            html: `
<div style="font-family: ${config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 20px; line-height: 1.3;">Hej ${contactPerson},</h2>
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Vi har en uppdatering om din beställning från B8Shield.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ny status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${statusInfo.name}</span></p>
      ${previousStatus ? `<p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px;"><strong>Tidigare status:</strong> ${getStatusInfo(previousStatus, lang).name}</p>` : ''}
    </div>

    ${trackingNumber ? `
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 10px;">[SPÅRNING] SPÅRNINGSINFORMATION:</h4>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin: 0;"><strong>Spårningsnummer:</strong> ${trackingNumber}</p>
      ${estimatedDelivery ? `<p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin: 5px 0 0 0;"><strong>Beräknad leverans:</strong> ${estimatedDelivery}</p>` : ''}
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; border-left: 4px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[NÄSTA STEG] VAD HÄNDER NU?</h4>
      <ul style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin: 0; padding-left: 20px;">
        ${nextSteps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
      </ul>
    </div>

    ${notes ? `
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin-top: 0; margin-bottom: 10px;">[ANTECKNINGAR] YTTERLIGARE INFORMATION:</h4>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin: 0; font-style: italic;">${notes}</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${(0, config_1.getOrderTrackingUrl)(orderId || orderNumber, 'sv-SE')}" style="display: inline-block; background-color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};">Visa orderdetaljer</a>
    </div>

    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin-top: 0; margin-bottom: 10px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 14px;">Om du har några frågor om din beställning, kontakta vår support på <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <div style="border-top: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; padding-top: 20px; margin-top: 30px;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        // English templates would go here...
    };
    const template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
exports.generateOrderStatusUpdateTemplate = generateOrderStatusUpdateTemplate;
//# sourceMappingURL=orderStatusUpdate.js.map