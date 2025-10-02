"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderNotificationAdminTemplate = void 0;
// Admin Order Notification Email Template
// Extracted from V3 Admin Templates - DESIGN PRESERVED + MOBILE OPTIMIZED
const config_1 = require("../core/config");
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
    const color = getDisplayColor(item.color);
    if (!color || color === '-' || color === 'Blandade färger' || color === 'Mixed colors') {
        return '';
    }
    return `<span style="display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;">Färg: ${color}</span>`;
}
// Helper function to generate size pill HTML for admin emails
function getSizePillAdmin(item) {
    const size = getDisplaySize(item.size);
    if (!size || size === '-' || size === 'Blandade storlekar' || size === 'Mixed sizes') {
        return '';
    }
    return `<span style="display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;">Storlek: ${size}</span>`;
}
// Helper function to generate pills row HTML for admin emails
function getPillsRowAdmin(item) {
    const colorPill = getColorPillAdmin(item);
    const sizePill = getSizePillAdmin(item);
    if (!colorPill && !sizePill) {
        return '';
    }
    return `<div style="margin-top: 6px; margin-bottom: 4px;">${colorPill}${sizePill}</div>`;
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
function generateOrderNotificationAdminTemplate(data, lang = 'sv-SE') {
    const { orderData, orderType, orderSummary } = data;
    // Extract payment method information
    const paymentMethod = orderData.payment?.method || 'unknown';
    const paymentStatus = orderData.payment?.status || 'unknown';
    const paymentIntentId = orderData.payment?.paymentIntentId || '';
    // Handle different affiliate data structures
    const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
    // Admin portal URL
    const adminPortalUrl = `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/admin/orders`;
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
    const { orderData } = data;
    const templates = {
        'sv-SE': {
            subject: `Ny B2C-beställning mottagen: ${orderData.orderNumber}`,
            html: `<div style="font-family: ${config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 22px; line-height: 1.3;">Ny B2C ${orderData.source === 'b2c' ? 'Gäst' : ''} Beställning Mottagen</h2>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[KUND] KUNDINFORMATION:</h3>
      <div style="font-size: 14px;">
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Kund:</strong> ${orderData.customerInfo.firstName || ''} ${orderData.customerInfo.lastName || ''}</p>
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>E-post:</strong> <a href="mailto:${orderData.customerInfo.email}" style="color: #2563eb; text-decoration: none;">${orderData.customerInfo.email}</a></p>
        ${orderData.shippingInfo ? `
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Leveransadress:</strong><br>
        ${orderData.shippingInfo.address}${orderData.shippingInfo.apartment ? ', ' + orderData.shippingInfo.apartment : ''}<br>
        ${orderData.shippingInfo.postalCode} ${orderData.shippingInfo.city}<br>
        ${orderData.shippingInfo.country}</p>
        ` : ''}
      </div>
    </div>

    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[PRODUKTER] ORDERDETALJER:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 10px;">
        ${orderData.items.map(item => `
          <div style="display: block; padding: 10px 0; border-bottom: 1px solid #d1fae5;">
            <div style="margin-bottom: 8px;">
              <div style="font-weight: bold; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 15px; margin-bottom: 2px;">${getCleanProductNameAdmin(item)}</div>
              ${getPillsRowAdmin(item)}
              <div style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 13px;">${item.quantity} st × ${(0, config_1.formatPrice)(item.price)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 16px;">${(0, config_1.formatPrice)(item.price * item.quantity)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 20px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[SAMMANFATTNING] ORDERSAMMANFATTNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 3px 0;">Delsumma:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 3px 0;">${(0, config_1.formatPrice)(orderData.subtotal || 0)}</td></tr>
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 3px 0;">Frakt:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 3px 0;">${(0, config_1.formatPrice)(orderData.shipping || 0)}</td></tr>
          ${orderData.discountAmount && orderData.discountAmount > 0 ? `<tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.SUCCESS}; padding: 3px 0;">Rabatt:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.SUCCESS}; font-weight: bold; text-align: right; padding: 3px 0;">-${(0, config_1.formatPrice)(orderData.discountAmount)}</td></tr>` : ''}
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 3px 0;">Moms (25%):</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 3px 0;">${(0, config_1.formatPrice)(orderData.vat || 0)}</td></tr>
          <tr><td colspan="2" style="border-top: 2px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 10px 0 0 0;"></td></tr>
          <tr><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 16px; font-weight: bold; padding: 3px 0;">TOTALT:</td><td style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 16px; font-weight: bold; text-align: right; padding: 3px 0;">${(0, config_1.formatPrice)(orderData.total || 0)}</td></tr>
        </table>
      </div>
    </div>

    <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[BETALNING] BETALNINGSINFORMATION:</h3>
      <div style="font-size: 14px;">
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Betalningsmetod:</strong> ${formatPaymentMethod(paymentMethod)}</p>
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Betalningsstatus:</strong> ${paymentStatus}</p>
        ${paymentIntentId ? `<p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Payment Intent ID:</strong> ${paymentIntentId}</p>` : ''}
      </div>
    </div>

    ${affiliateCode ? `
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[AFFILIATE] AFFILIATE-INFORMATION:</h3>
      <div style="font-size: 14px;">
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Affiliate-kod:</strong> ${affiliateCode}</p>
        ${orderData.discountAmount && orderData.discountAmount > 0 ? `<p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Rabatt tillämpad:</strong> ${(0, config_1.formatPrice)(orderData.discountAmount)}</p>` : ''}
      </div>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${adminPortalUrl}" style="display: inline-block; background-color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};">Hantera order</a>
    </div>
    
    <div style="border-top: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; padding-top: 15px; margin-top: 25px; text-align: center;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 13px; margin: 0;">Denna beställning gjordes på B2C-butiken på shop.b8shield.com<br><strong>B8Shield Admin Notification</strong></p>
    </div>
  </div>
</div>`
        },
        'en-GB': {
            subject: `New B2C Order Received: ${orderData.orderNumber}`,
            html: `<div>English B2C Admin Template</div>`
        },
        'en-US': {
            subject: `New B2C Order Received: ${orderData.orderNumber}`,
            html: `<div>US English B2C Admin Template</div>`
        }
    };
    const template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
// B2B Admin Template (Business order notification)
function generateB2BAdminTemplate(data, lang, adminPortalUrl, orderSummary) {
    const { orderData } = data;
    const templates = {
        'sv-SE': {
            subject: `Ny B2B-beställning: ${orderData.orderNumber} från ${orderData.customerInfo.companyName || orderData.customerInfo.name}`,
            html: `<div style="font-family: ${config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 22px; line-height: 1.3;">Ny B2B-beställning mottagen</h2>
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; font-size: 14px;">En ny beställning har skapats i B2B-portalen och behöver behandling.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
      <h3 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[ORDER] ORDERINFORMATION:</h3>
      <div style="font-size: 14px;">
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Skapad:</strong> ${orderData.createdAt || 'Just nu'}</p>
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">Ny - Behöver behandling</span></p>
      </div>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[KUND] KUNDINFORMATION:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 12px; font-size: 14px;">
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Företag:</strong> ${orderData.customerInfo.companyName || orderData.customerInfo.name}</p>
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>E-post:</strong> <a href="mailto:${orderData.customerInfo.email}" style="color: #2563eb; text-decoration: none;">${orderData.customerInfo.email}</a></p>
        <p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Kontaktperson:</strong> ${orderData.customerInfo.contactPerson || 'Ej angiven'}</p>
        ${orderData.customerInfo.phone ? `<p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Telefon:</strong> <a href="tel:${orderData.customerInfo.phone}" style="color: #2563eb; text-decoration: none;">${orderData.customerInfo.phone}</a></p>` : ''}
        ${orderData.customerInfo.address ? `<p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Adress:</strong> ${orderData.customerInfo.address}${orderData.customerInfo.postalCode && orderData.customerInfo.city ? `, ${orderData.customerInfo.postalCode} ${orderData.customerInfo.city}` : ''}</p>` : ''}
        ${orderData.customerInfo.marginal ? `<p style="margin: 6px 0; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Kundmarginal:</strong> ${orderData.customerInfo.marginal}%</p>` : ''}
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[BESTÄLLNING] ORDERDETALJER:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 12px;">
        <div style="white-space: pre-line; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.5; font-family: monospace; font-size: 13px;">${orderSummary || 'Orderdetaljer saknas'}</div>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 20px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[TOTALT] ORDERSAMMANFATTNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 12px;">
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: bold; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY};">${(0, config_1.formatPrice)(orderData.total)}</div>
          <div style="font-size: 13px; color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-top: 4px;">Inklusive kundens återförsäljarmarginal</div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
      <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 12px; font-size: 16px;">[ÅTGÄRD] ÅTGÄRDER BEHÖVS:</h3>
      <ol style="color: #dc2626; margin: 0; padding-left: 18px; line-height: 1.5; font-size: 14px;">
        <li>Granska orderdetaljer och kunduppgifter</li>
        <li>Bekräfta lagerstatus för alla produkter</li>
        <li>Uppdatera orderstatus till "Bekräftad" eller "Behandlas"</li>
        <li>Skicka orderbekräftelse till kunden</li>
        <li>Planera leverans och packning</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${adminPortalUrl}" style="display: inline-block; background-color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};">Hantera order</a>
    </div>
    
    <div style="border-top: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; padding-top: 15px; margin-top: 25px; text-align: center;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 13px; margin: 0;">B8Shield Admin Notification<br><strong>B2B Orderhantering</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-GB': {
            subject: `New B2B Order: ${orderData.orderNumber} from ${orderData.customerInfo.companyName || orderData.customerInfo.name}`,
            html: `<div>English B2B Admin Template</div>`
        },
        'en-US': {
            subject: `New B2B Order: ${orderData.orderNumber} from ${orderData.customerInfo.companyName || orderData.customerInfo.name}`,
            html: `<div>US English B2B Admin Template</div>`
        }
    };
    const template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
//# sourceMappingURL=orderNotificationAdmin.js.map