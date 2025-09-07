// B2C order pending/confirmation email template
import { APP_URLS, getLanguageSegment } from '../config';

export interface B2COrderPendingData {
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
}

// Helper function to get product name from multilingual object
function getProductName(item: any, lang: string): string {
  if (typeof item.name === 'object') {
    return item.name[lang] || item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'Okänd produkt';
  }
  return item.name || 'Okänd produkt';
}

// Helper function to get product display name with color and size
function getProductDisplayName(item: any, lang: string): string {
  const baseName = getProductName(item, lang);
  const color = item.color;
  const size = item.size;
  
  let displayName = baseName;
  
  // Add color if available
  if (color && color !== 'Blandade färger' && color !== 'Mixed colors') {
    displayName += ` ${color}`;
  }
  
  // Add size if available
  if (size && size !== 'Blandade storlekar' && size !== 'Mixed sizes') {
    // Convert size to readable format
    const sizeText = lang.startsWith('en') ? 'size' : 'stl.';
    if (size.includes('Storlek') || size.includes('Size')) {
      // Extract number from "Storlek 2" -> "stl. 2"
      const sizeNumber = size.replace(/Storlek|Size/i, '').trim();
      displayName += `, ${sizeText} ${sizeNumber}`;
    } else {
      displayName += `, ${sizeText} ${size}`;
    }
  }
  
  return displayName;
}

// Helper function to format price
function formatPrice(price: number): string {
  return `${price.toFixed(0)} SEK`;
}

export function getB2COrderPendingTemplate(data: B2COrderPendingData, lang: string = 'sv-SE') {
  const { orderData, customerInfo, orderId } = data;
  const { orderNumber, items = [], subtotal = 0, shipping = 0, vat = 0, total = 0, discountAmount = 0 } = orderData;
  
  // Handle different affiliate data structures (Stripe vs Mock payments)
  const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
  const customerName = customerInfo.firstName + (customerInfo.lastName ? ' ' + customerInfo.lastName : '') || customerInfo.name || 'Kund';
  const segment = getLanguageSegment(lang);
  const orderUrl = `${APP_URLS.B2C_SHOP}/${segment}/order-confirmation/${orderId || ''}`;
  const supportUrl = `${APP_URLS.B2B_PORTAL}/contact`;

  const templates = {
    'sv-SE': {
      subject: `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
      html: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 15px;">
  <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 20px; line-height: 1.3;">Hej ${customerName},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Tack för din beställning från B8Shield! Vi har mottagit din order och kommer att behandla den snarast.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Mottagen</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>E-post:</strong> ${customerInfo.email}</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[PRODUKTER] DINA PRODUKTER:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 10px;">
        ${items.map(item => `
          <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e5e7eb; padding: 15px 0; margin-bottom: 10px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
              ${item.image ? `
              <div style="flex-shrink: 0; margin-right: 12px;">
                <img src="${item.image}" alt="${getProductDisplayName(item, lang)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; display: block;" />
              </div>
              ` : ''}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: #1f2937; font-size: 16px; line-height: 1.4; margin-bottom: 6px;">${getProductDisplayName(item, lang)}</div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Kvantitet: ${item.quantity} st × ${formatPrice(item.price)}</div>
              </div>
            </div>
            <div style="text-align: right; background-color: #f9fafb; padding: 8px 12px; border-radius: 4px;">
              <div style="font-weight: bold; color: #1f2937; font-size: 18px;">${formatPrice(item.price * item.quantity)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SAMMANFATTNING] ORDERSAMMANFATTNING:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Delsumma:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(subtotal)}</td>
          </tr>
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Frakt:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(shipping)}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr style="margin-bottom: 8px;">
            <td style="color: #059669; padding: 4px 0;">Rabatt ${affiliateCode ? '(' + affiliateCode + ')' : ''}:</td>
            <td style="color: #059669; font-weight: bold; text-align: right; padding: 4px 0;">-${formatPrice(discountAmount)}</td>
          </tr>
          ` : ''}
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Moms (25%):</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(vat)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTALT:</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(total)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Följ din order</a>
    </div>

    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">Om du har några frågor om din beställning, kontakta vår support på <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>

    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Du kommer att få ytterligare uppdateringar när din order behandlas och skickas.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-GB': {
      subject: `Thank you for your order, ${customerName}! (Order ${orderNumber})`,
      html: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 15px;">
  <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 20px; line-height: 1.3;">Hello ${customerName},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Thank you for shopping with B8Shield! We have received your order and will process it shortly.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER DETAILS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order number:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Received</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${customerInfo.email}</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[PRODUCTS] YOUR PRODUCTS:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 10px;">
        ${items.map(item => `
          <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e5e7eb; padding: 15px 0; margin-bottom: 10px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
              ${item.image ? `
              <div style="flex-shrink: 0; margin-right: 12px;">
                <img src="${item.image}" alt="${getProductDisplayName(item, lang)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; display: block;" />
              </div>
              ` : ''}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: #1f2937; font-size: 16px; line-height: 1.4; margin-bottom: 6px;">${getProductDisplayName(item, lang)}</div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Quantity: ${item.quantity} pcs × ${formatPrice(item.price)}</div>
              </div>
            </div>
            <div style="text-align: right; background-color: #f9fafb; padding: 8px 12px; border-radius: 4px;">
              <div style="font-weight: bold; color: #1f2937; font-size: 18px;">${formatPrice(item.price * item.quantity)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SUMMARY] ORDER SUMMARY:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Subtotal:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(subtotal)}</td>
          </tr>
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Shipping:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(shipping)}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr style="margin-bottom: 8px;">
            <td style="color: #059669; padding: 4px 0;">Discount ${affiliateCode ? '(' + affiliateCode + ')' : ''}:</td>
            <td style="color: #059669; font-weight: bold; text-align: right; padding: 4px 0;">-${formatPrice(discountAmount)}</td>
          </tr>
          ` : ''}
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">VAT (25%):</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(vat)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTAL:</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(total)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Track your order</a>
    </div>

    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions about your order, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>

    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">You will receive further updates as your order progresses and is shipped out.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Kind regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-US': {
      subject: `Thank you for your order, ${customerName}! (Order ${orderNumber})`,
      html: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 15px;">
  <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 20px; line-height: 1.3;">Hello ${customerName},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Thank you for shopping with B8Shield! We have received your order and will process it shortly.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER DETAILS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order number:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Received</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${customerInfo.email}</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[PRODUCTS] YOUR PRODUCTS:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 10px;">
        ${items.map(item => `
          <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e5e7eb; padding: 15px 0; margin-bottom: 10px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
              ${item.image ? `
              <div style="flex-shrink: 0; margin-right: 12px;">
                <img src="${item.image}" alt="${getProductDisplayName(item, lang)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; display: block;" />
              </div>
              ` : ''}
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: #1f2937; font-size: 16px; line-height: 1.4; margin-bottom: 6px;">${getProductDisplayName(item, lang)}</div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Quantity: ${item.quantity} pcs × ${formatPrice(item.price)}</div>
              </div>
            </div>
            <div style="text-align: right; background-color: #f9fafb; padding: 8px 12px; border-radius: 4px;">
              <div style="font-weight: bold; color: #1f2937; font-size: 18px;">${formatPrice(item.price * item.quantity)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SUMMARY] ORDER SUMMARY:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Subtotal:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(subtotal)}</td>
          </tr>
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Shipping:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(shipping)}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr style="margin-bottom: 8px;">
            <td style="color: #059669; padding: 4px 0;">Discount ${affiliateCode ? '(' + affiliateCode + ')' : ''}:</td>
            <td style="color: #059669; font-weight: bold; text-align: right; padding: 4px 0;">-${formatPrice(discountAmount)}</td>
          </tr>
          ` : ''}
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">VAT (25%):</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(vat)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTAL:</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(total)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Track your order</a>
    </div>

    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions about your order, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>

    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">You will receive further updates as your order progresses and is shipped out.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    }
  };

  const template = templates[lang as keyof typeof templates] || templates['sv-SE'];
  return {
    subject: template.subject,
    html: template.html
  };
}
