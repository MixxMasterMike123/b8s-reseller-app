// Order Confirmation Email Template
// Extracted from V3 B2C Order Pending Template - DESIGN PRESERVED
import { EMAIL_CONFIG, formatPrice, getSupportUrl, getOrderTrackingUrl } from '../core/config';

export interface OrderConfirmationData {
  orderData: {
    orderNumber: string;
    items: Array<{
      name: string | { [key: string]: string };
      color?: string;
      size?: string;
      quantity: number;
      price: number;
      image?: string;
    }>;
    subtotal: number;
    shipping: number;
    vat: number;
    total: number;
    discountAmount?: number;
    affiliateCode?: string;
    affiliate?: { code: string };
  };
  customerInfo: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
  };
  orderId: string;
  orderType: 'B2B' | 'B2C';
}

// Helper function to get product name from multilingual object
function getProductName(item: any, lang: string): string {
  if (typeof item.name === 'object') {
    return item.name[lang] || item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'Okänd produkt';
  }
  return item.name || 'Okänd produkt';
}

// Helper function to format size for display (replicates frontend getDisplaySize logic)
function getDisplaySize(size: any): string {
  if (!size) return '-';
  if (typeof size === 'string') return size;
  if (typeof size === 'object') {
    return size['sv-SE'] || size['en-GB'] || size['en-US'] || Object.values(size)[0] || '-';
  }
  return String(size);
}

// Helper function to format color for display (replicates frontend getDisplayColor logic)
function getDisplayColor(color: any): string {
  if (!color) return '-';
  if (typeof color === 'string') return color;
  if (typeof color === 'object') {
    return color['sv-SE'] || color['en-GB'] || color['en-US'] || Object.values(color)[0] || '-';
  }
  return String(color);
}

// Helper function to get clean product name without color/size (for pill design)
function getCleanProductName(item: any, lang: string): string {
  return getProductName(item, lang);
}

// Helper function to generate color pill HTML
function getColorPill(item: any): string {
  const color = getDisplayColor(item.color);
  if (!color || color === '-' || color === 'Blandade färger' || color === 'Mixed colors') {
    return '';
  }
  
  return `<span style="display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;">Färg: ${color}</span>`;
}

// Helper function to generate size pill HTML
function getSizePill(item: any, lang: string): string {
  const size = getDisplaySize(item.size);
  if (!size || size === '-' || size === 'Blandade storlekar' || size === 'Mixed sizes') {
    return '';
  }
  
  const sizeLabel = lang.startsWith('en') ? 'Size' : 'Storlek';
  return `<span style="display: inline-block; background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid #d1d5db;">${sizeLabel}: ${size}</span>`;
}

// Helper function to generate pills row HTML
function getPillsRow(item: any, lang: string): string {
  const colorPill = getColorPill(item);
  const sizePill = getSizePill(item, lang);
  
  if (!colorPill && !sizePill) {
    return '';
  }
  
  return `<div style="margin-top: 6px; margin-bottom: 4px;">${colorPill}${sizePill}</div>`;
}

// DEPRECATED: Keep for backward compatibility but use pill design instead
function getProductDisplayName(item: any, lang: string): string {
  return getCleanProductName(item, lang);
}

export function generateOrderConfirmationTemplate(data: OrderConfirmationData, lang: string = 'sv-SE', orderId?: string) {
  const { orderData, customerInfo, orderType } = data;
  
  // Handle different affiliate data structures (Stripe vs Mock payments)
  const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
  const customerName = customerInfo.firstName + (customerInfo.lastName ? ' ' + customerInfo.lastName : '') || customerInfo.name || 'Kund';
  
  // Generate URLs - USE ORDER DB ID NOT ORDER NUMBER (same pattern as status update)
  const finalOrderId = orderId || data.orderId;
  const orderUrl = getOrderTrackingUrl(finalOrderId, lang);
  const supportUrl = getSupportUrl(lang);

  // Choose template based on order type
  if (orderType === 'B2B') {
    return generateB2BTemplate(data, lang, customerName, orderUrl, supportUrl);
  } else {
    return generateB2CTemplate(data, lang, customerName, orderUrl, supportUrl, affiliateCode);
  }
}

// B2C Template (Consumer-focused)
function generateB2CTemplate(
  data: OrderConfirmationData, 
  lang: string, 
  customerName: string, 
  orderUrl: string, 
  supportUrl: string,
  affiliateCode?: string
) {
  const { orderData, customerInfo } = data;
  const { orderNumber, items, subtotal, shipping, vat, total, discountAmount = 0 } = orderData;

  const templates = {
    'sv-SE': {
      subject: `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
      html: `<div style="font-family: ${EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    <h2 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 20px; line-height: 1.3;">Hej ${customerName},</h2>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Tack för din beställning från B8Shield! Vi har mottagit din order och kommer att behandla den snarast.</p>
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Status:</strong> <span style="color: ${EMAIL_CONFIG.COLORS.SUCCESS}; font-weight: bold;">Mottagen</span></p>
      <p style="margin: 8px 0; color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>E-post:</strong> ${customerInfo.email}</p>
    </div>
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[PRODUKTER] DINA PRODUKTER:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 10px;">
        ${items.map(item => `
          <div style="display: flex; flex-direction: column; border-bottom: 1px solid ${EMAIL_CONFIG.COLORS.BORDER}; padding: 15px 0; margin-bottom: 10px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
              ${item.image ? `
              <div style="flex-shrink: 0; margin-right: 12px;">
                <img src="${item.image}" alt="${getCleanProductName(item, lang)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid ${EMAIL_CONFIG.COLORS.BORDER}; display: block;" />
              </div>
              ` : ''}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 16px; line-height: 1.4; margin-bottom: 2px;">${getCleanProductName(item, lang)}</div>
                ${getPillsRow(item, lang)}
                <div style="font-size: 14px; color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-bottom: 8px;">Kvantitet: ${item.quantity} st × ${formatPrice(item.price)}</div>
              </div>
            </div>
            <div style="text-align: right; background-color: ${EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 8px 12px; border-radius: 4px;">
              <div style="font-weight: bold; color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 18px;">${formatPrice(item.price * item.quantity)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="background-color: #fef3c7; border-left: 4px solid ${EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SAMMANFATTNING] ORDERSAMMANFATTNING:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 4px 0;">Delsumma:</td><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(subtotal)}</td></tr>
          <tr><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 4px 0;">Frakt:</td><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(shipping)}</td></tr>
          ${discountAmount > 0 ? `<tr><td style="color: ${EMAIL_CONFIG.COLORS.SUCCESS}; padding: 4px 0;">Rabatt ${affiliateCode ? '(' + affiliateCode + ')' : ''}:</td><td style="color: ${EMAIL_CONFIG.COLORS.SUCCESS}; font-weight: bold; text-align: right; padding: 4px 0;">-${formatPrice(discountAmount)}</td></tr>` : ''}
          <tr><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; padding: 4px 0;">Moms (25%):</td><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(vat)}</td></tr>
          <tr><td colspan="2" style="border-top: 2px solid ${EMAIL_CONFIG.COLORS.WARNING}; padding: 15px 0 0 0;"></td></tr>
          <tr><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTALT:</td><td style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(total)}</td></tr>
        </table>
      </div>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background-color: ${EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Följ din order</a>
    </div>
    <div style="border-top: 1px solid ${EMAIL_CONFIG.COLORS.BORDER}; padding-top: 20px; margin-top: 30px;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
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

  const template = templates[lang as keyof typeof templates] || templates['sv-SE'];
  return {
    subject: template.subject,
    html: template.html
  };
}

// B2B Template (Business-focused)
function generateB2BTemplate(
  data: OrderConfirmationData, 
  lang: string, 
  customerName: string, 
  orderUrl: string, 
  supportUrl: string
) {
  const { orderData } = data;
  const { orderNumber, total } = orderData;

  const templates = {
    'sv-SE': {
      subject: `Orderbekräftelse: ${orderNumber}`,
      html: `<div style="font-family: ${EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 20px;">
  <div style="background-color: white; border-radius: ${EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px;">Orderbekräftelse</h2>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Hej ${customerName},</p>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 25px;">Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY};"><strong>Företag:</strong> ${customerName}</p>
    </div>
    <div style="background-color: #fef3c7; border-left: 4px solid ${EMAIL_CONFIG.COLORS.WARNING}; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTALT] ORDERSAMMANFATTNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY};">${formatPrice(total)}</div>
          <div style="font-size: 14px; color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-top: 4px;">Inklusive din återförsäljarmarginal</div>
        </div>
      </div>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${EMAIL_CONFIG.URLS.B2B_PORTAL}" style="display: inline-block; background-color: ${EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Gå till portalen</a>
    </div>
    <div style="border-top: 1px solid ${EMAIL_CONFIG.COLORS.BORDER}; padding-top: 20px; margin-top: 30px;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
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

  const template = templates[lang as keyof typeof templates] || templates['sv-SE'];
  return {
    subject: template.subject,
    html: template.html
  };
}