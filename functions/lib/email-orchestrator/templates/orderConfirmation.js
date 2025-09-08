"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderConfirmationTemplate = void 0;
// Order Confirmation Email Template
// Extracted from V3 B2C Order Pending Template - DESIGN PRESERVED
const config_1 = require("../core/config");
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
// Helper function to get product display name with color and size (same logic as admin email)
function getProductDisplayName(item, lang) {
    // DEBUG: Log the actual item data to see what we're working with
    console.log('🔍 Customer Email - Item data:', JSON.stringify(item, null, 2));
    console.log('🔍 Customer Email - item.color:', item.color, 'type:', typeof item.color);
    console.log('🔍 Customer Email - item.size:', item.size, 'type:', typeof item.size);
    // Handle multilingual product names
    const baseName = getProductName(item, lang);
    // Use the same logic as frontend and admin email
    const color = getDisplayColor(item.color);
    const size = getDisplaySize(item.size);
    let displayName = baseName;
    // Add color if available (not default values)
    if (color && color !== '-' && color !== 'Blandade färger' && color !== 'Mixed colors') {
        displayName += ` ${color}`;
    }
    // Add size if available (not default values)
    if (size && size !== '-' && size !== 'Blandade storlekar' && size !== 'Mixed sizes') {
        const sizeText = lang.startsWith('en') ? 'size' : 'stl.';
        displayName += `, ${sizeText} ${size}`;
    }
    console.log('🔍 Customer Email - Final display name:', displayName);
    return displayName;
}
function generateOrderConfirmationTemplate(data, lang = 'sv-SE') {
    const { orderData, customerInfo, orderType, orderId } = data;
    // Handle different affiliate data structures (Stripe vs Mock payments)
    const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
    const customerName = customerInfo.firstName + (customerInfo.lastName ? ' ' + customerInfo.lastName : '') || customerInfo.name || 'Kund';
    // Generate URLs - USE ORDER DB ID NOT ORDER NUMBER
    const orderUrl = (0, config_1.getOrderTrackingUrl)(orderId, lang);
    const supportUrl = (0, config_1.getSupportUrl)(lang);
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
    const { orderData, customerInfo } = data;
    const { orderNumber, items, subtotal, shipping, vat, total, discountAmount = 0 } = orderData;
    const templates = {
        'sv-SE': {
            subject: `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
            html: `<div style="font-family: ${config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    <h2 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 20px; line-height: 1.3;">Hej ${customerName},</h2>
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Tack för din beställning från B8Shield! Vi har mottagit din order och kommer att behandla den snarast.</p>
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Status:</strong> <span style="color: ${config_1.EMAIL_CONFIG.COLORS.SUCCESS}; font-weight: bold;">Mottagen</span></p>
      <p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>E-post:</strong> ${customerInfo.email}</p>
    </div>
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[PRODUKTER] DINA PRODUKTER:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 10px;">
        ${items.map(item => `
          <div style="display: flex; flex-direction: column; border-bottom: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; padding: 15px 0; margin-bottom: 10px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
              ${item.image ? `
              <div style="flex-shrink: 0; margin-right: 12px;">
                <img src="${item.image}" alt="${getProductDisplayName(item, lang)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; display: block;" />
              </div>
              ` : ''}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 16px; line-height: 1.4; margin-bottom: 6px;">${getProductDisplayName(item, lang)}</div>
                <div style="font-size: 14px; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-bottom: 8px;">Kvantitet: ${item.quantity} st × ${(0, config_1.formatPrice)(item.price)}</div>
              </div>
            </div>
            <div style="text-align: right; background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 8px 12px; border-radius: 4px;">
              <div style="font-weight: bold; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 18px;">${(0, config_1.formatPrice)(item.price * item.quantity)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="background-color: #fef3c7; border-left: 4px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SAMMANFATTNING] ORDERSAMMANFATTNING:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 4px 0;">Delsumma:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 4px 0;">${(0, config_1.formatPrice)(subtotal)}</td></tr>
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 4px 0;">Frakt:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 4px 0;">${(0, config_1.formatPrice)(shipping)}</td></tr>
          ${discountAmount > 0 ? `<tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.SUCCESS}; padding: 4px 0;">Rabatt ${affiliateCode ? '(' + affiliateCode + ')' : ''}:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.SUCCESS}; font-weight: bold; text-align: right; padding: 4px 0;">-${(0, config_1.formatPrice)(discountAmount)}</td></tr>` : ''}
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 4px 0;">Moms (25%):</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 4px 0;">${(0, config_1.formatPrice)(vat)}</td></tr>
          <tr><td colspan="2" style="border-top: 2px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 15px 0 0 0;"></td></tr>
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTALT:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${(0, config_1.formatPrice)(total)}</td></tr>
        </table>
      </div>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background-color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};">Följ din order</a>
    </div>
    <div style="border-top: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; padding-top: 20px; margin-top: 30px;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-GB': {
            subject: `Thank you for your order, ${customerName}! (Order ${orderNumber})`,
            html: `<div>English B2C template</div>`
        },
        'en-US': {
            subject: `Thank you for your order, ${customerName}! (Order ${orderNumber})`,
            html: `<div>US English B2C template</div>`
        }
    };
    const template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
// B2B Template (Business-focused)
function generateB2BTemplate(data, lang, customerName, orderUrl, supportUrl) {
    const { orderData } = data;
    const { orderNumber, total } = orderData;
    const templates = {
        'sv-SE': {
            subject: `Orderbekräftelse: ${orderNumber}`,
            html: `<div style="font-family: ${config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 20px;">
  <div style="background-color: white; border-radius: ${config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px;">Orderbekräftelse</h2>
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Hej ${customerName},</p>
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 25px;">Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Företag:</strong> ${customerName}</p>
    </div>
    <div style="background-color: #fef3c7; border-left: 4px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTALT] ORDERSAMMANFATTNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY};">${(0, config_1.formatPrice)(total)}</div>
          <div style="font-size: 14px; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-top: 4px;">Inklusive din återförsäljarmarginal</div>
        </div>
      </div>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}" style="display: inline-block; background-color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};">Gå till portalen</a>
    </div>
    <div style="border-top: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; padding-top: 20px; margin-top: 30px;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-GB': {
            subject: `Order Confirmation: ${orderNumber}`,
            html: `<div>English B2B template</div>`
        },
        'en-US': {
            subject: `Order Confirmation: ${orderNumber}`,
            html: `<div>US English B2B template</div>`
        }
    };
    const template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
//# sourceMappingURL=orderConfirmation.js.map