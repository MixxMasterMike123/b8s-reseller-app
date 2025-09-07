// Admin B2C order notification email template
import { APP_URLS } from '../config';

export interface AdminB2COrderNotificationData {
  orderData: {
    orderNumber: string;
    source?: string;
    customerInfo: {
      firstName: string;
      lastName?: string;
      email: string;
    };
    shippingInfo?: {
      address: string;
      apartment?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    items: Array<{
      name: string | { [key: string]: string };
      color?: string;
      size?: string;
      quantity: number;
      price: number;
    }>;
    subtotal: number;
    shipping: number;
    vat: number;
    total: number;
    discountAmount?: number;
    affiliateCode?: string;
    affiliate?: { code: string };
    payment?: {
      method: string;
      status: string;
      paymentIntentId?: string;
    };
  };
}

// Helper function to get product display name with color and size for admin emails
function getProductDisplayNameAdmin(item: any): string {
  // Handle multilingual product names
  const baseName = typeof item.name === 'object' 
    ? (item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || JSON.stringify(item.name))
    : item.name || 'Unknown Product';
  
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
    if (size.includes('Storlek') || size.includes('Size')) {
      // Extract number from "Storlek 2" -> "stl. 2"
      const sizeNumber = size.replace(/Storlek|Size/i, '').trim();
      displayName += `, stl. ${sizeNumber}`;
    } else {
      displayName += `, stl. ${size}`;
    }
  }
  
  return displayName;
}

// Helper function to format price
function formatPrice(price: number): string {
  return `${price.toFixed(0)} SEK`;
}

// Format payment method display
function formatPaymentMethod(method: string): string {
  switch(method) {
    case 'stripe': return 'Stripe (Card/Klarna/Google Pay)';
    case 'mock_payment': return 'Test Payment';
    default: return method;
  }
}

export function getAdminB2COrderNotificationTemplate(data: AdminB2COrderNotificationData, lang: string = 'sv-SE') {
  const { orderData } = data;
  
  // Extract payment method information
  const paymentMethod = orderData.payment?.method || 'unknown';
  const paymentStatus = orderData.payment?.status || 'unknown';
  const paymentIntentId = orderData.payment?.paymentIntentId || '';
  
  // Handle different affiliate data structures
  const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;

  const templates = {
    'sv-SE': {
      subject: `Ny B2C-beställning mottagen: ${orderData.orderNumber}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Ny B2C ${orderData.source === 'b2c' ? 'Gäst' : ''} Beställning Mottagen</h2>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px;">[KUND] KUNDINFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Kund:</strong> ${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName || ''}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>E-post:</strong> ${orderData.customerInfo.email}</p>
      ${orderData.shippingInfo ? `
      <p style="margin: 8px 0; color: #374151;"><strong>Leveransadress:</strong><br>
      ${orderData.shippingInfo.address}${orderData.shippingInfo.apartment ? ', ' + orderData.shippingInfo.apartment : ''}<br>
      ${orderData.shippingInfo.postalCode} ${orderData.shippingInfo.city}<br>
      ${orderData.shippingInfo.country}</p>
      ` : ''}
    </div>

    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[PRODUKTER] ORDERDETALJER:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        ${orderData.items.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #d1fae5;">
            <div style="flex: 1;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">${getProductDisplayNameAdmin(item)}</div>
              <div style="color: #6b7280; font-size: 14px;">${item.quantity} st × ${formatPrice(item.price)}</div>
            </div>
            <div style="font-weight: bold; color: #1f2937; font-size: 16px;">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SAMMANFATTNING] ORDERSAMMANFATTNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Delsumma:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.subtotal || 0)}</td>
          </tr>
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Frakt:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.shipping || 0)}</td>
          </tr>
          ${orderData.discountAmount && orderData.discountAmount > 0 ? `
          <tr style="margin-bottom: 8px;">
            <td style="color: #059669; padding: 4px 0;">Rabatt:</td>
            <td style="color: #059669; font-weight: bold; text-align: right; padding: 4px 0;">-${formatPrice(orderData.discountAmount)}</td>
          </tr>
          ` : ''}
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Moms (25%):</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.vat || 0)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTALT:</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.total || 0)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[BETALNING] BETALNINGSINFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Betalningsmetod:</strong> ${formatPaymentMethod(paymentMethod)}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Betalningsstatus:</strong> ${paymentStatus}</p>
      ${paymentIntentId ? `<p style="margin: 8px 0; color: #374151;"><strong>Payment Intent ID:</strong> ${paymentIntentId}</p>` : ''}
    </div>

    ${affiliateCode ? `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">[AFFILIATE] AFFILIATE-INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Affiliate-kod:</strong> ${affiliateCode}</p>
      ${orderData.discountAmount && orderData.discountAmount > 0 ? `<p style="margin: 8px 0; color: #374151;"><strong>Rabatt tillämpad:</strong> ${formatPrice(orderData.discountAmount)}</p>` : ''}
    </div>
    ` : ''}
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Denna beställning gjordes på B2C-butiken på shop.b8shield.com</p>
    </div>
  </div>
</div>`
    },
    'en-GB': {
      subject: `New B2C Order Received: ${orderData.orderNumber}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">New B2C ${orderData.source === 'b2c' ? 'Guest' : ''} Order Received</h2>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px;">[CUSTOMER] CUSTOMER INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Customer:</strong> ${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName || ''}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${orderData.customerInfo.email}</p>
      ${orderData.shippingInfo ? `
      <p style="margin: 8px 0; color: #374151;"><strong>Shipping Address:</strong><br>
      ${orderData.shippingInfo.address}${orderData.shippingInfo.apartment ? ', ' + orderData.shippingInfo.apartment : ''}<br>
      ${orderData.shippingInfo.postalCode} ${orderData.shippingInfo.city}<br>
      ${orderData.shippingInfo.country}</p>
      ` : ''}
    </div>

    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[PRODUCTS] ORDER DETAILS:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        ${orderData.items.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #d1fae5;">
            <div style="flex: 1;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">${getProductDisplayNameAdmin(item)}</div>
              <div style="color: #6b7280; font-size: 14px;">${item.quantity} pcs × ${formatPrice(item.price)}</div>
            </div>
            <div style="font-weight: bold; color: #1f2937; font-size: 16px;">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SUMMARY] ORDER SUMMARY:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Subtotal:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.subtotal || 0)}</td>
          </tr>
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Shipping:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.shipping || 0)}</td>
          </tr>
          ${orderData.discountAmount && orderData.discountAmount > 0 ? `
          <tr style="margin-bottom: 8px;">
            <td style="color: #059669; padding: 4px 0;">Discount:</td>
            <td style="color: #059669; font-weight: bold; text-align: right; padding: 4px 0;">-${formatPrice(orderData.discountAmount)}</td>
          </tr>
          ` : ''}
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">VAT (25%):</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.vat || 0)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTAL:</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.total || 0)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[PAYMENT] PAYMENT INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Payment Method:</strong> ${formatPaymentMethod(paymentMethod)}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Payment Status:</strong> ${paymentStatus}</p>
      ${paymentIntentId ? `<p style="margin: 8px 0; color: #374151;"><strong>Payment Intent ID:</strong> ${paymentIntentId}</p>` : ''}
    </div>

    ${affiliateCode ? `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">[AFFILIATE] AFFILIATE INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Affiliate Code:</strong> ${affiliateCode}</p>
      ${orderData.discountAmount && orderData.discountAmount > 0 ? `<p style="margin: 8px 0; color: #374151;"><strong>Discount Applied:</strong> ${formatPrice(orderData.discountAmount)}</p>` : ''}
    </div>
    ` : ''}
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">This order was placed on the B2C shop at shop.b8shield.com</p>
    </div>
  </div>
</div>`
    },
    'en-US': {
      subject: `New B2C Order Received: ${orderData.orderNumber}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">New B2C ${orderData.source === 'b2c' ? 'Guest' : ''} Order Received</h2>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px;">[CUSTOMER] CUSTOMER INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Customer:</strong> ${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName || ''}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${orderData.customerInfo.email}</p>
      ${orderData.shippingInfo ? `
      <p style="margin: 8px 0; color: #374151;"><strong>Shipping Address:</strong><br>
      ${orderData.shippingInfo.address}${orderData.shippingInfo.apartment ? ', ' + orderData.shippingInfo.apartment : ''}<br>
      ${orderData.shippingInfo.postalCode} ${orderData.shippingInfo.city}<br>
      ${orderData.shippingInfo.country}</p>
      ` : ''}
    </div>

    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[PRODUCTS] ORDER DETAILS:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        ${orderData.items.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #d1fae5;">
            <div style="flex: 1;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">${getProductDisplayNameAdmin(item)}</div>
              <div style="color: #6b7280; font-size: 14px;">${item.quantity} pcs × ${formatPrice(item.price)}</div>
            </div>
            <div style="font-weight: bold; color: #1f2937; font-size: 16px;">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[SUMMARY] ORDER SUMMARY:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Subtotal:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.subtotal || 0)}</td>
          </tr>
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">Shipping:</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.shipping || 0)}</td>
          </tr>
          ${orderData.discountAmount && orderData.discountAmount > 0 ? `
          <tr style="margin-bottom: 8px;">
            <td style="color: #059669; padding: 4px 0;">Discount:</td>
            <td style="color: #059669; font-weight: bold; text-align: right; padding: 4px 0;">-${formatPrice(orderData.discountAmount)}</td>
          </tr>
          ` : ''}
          <tr style="margin-bottom: 8px;">
            <td style="color: #374151; padding: 4px 0;">VAT (25%):</td>
            <td style="color: #374151; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.vat || 0)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTAL:</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPrice(orderData.total || 0)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[PAYMENT] PAYMENT INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Payment Method:</strong> ${formatPaymentMethod(paymentMethod)}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Payment Status:</strong> ${paymentStatus}</p>
      ${paymentIntentId ? `<p style="margin: 8px 0; color: #374151;"><strong>Payment Intent ID:</strong> ${paymentIntentId}</p>` : ''}
    </div>

    ${affiliateCode ? `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">[AFFILIATE] AFFILIATE INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Affiliate Code:</strong> ${affiliateCode}</p>
      ${orderData.discountAmount && orderData.discountAmount > 0 ? `<p style="margin: 8px 0; color: #374151;"><strong>Discount Applied:</strong> ${formatPrice(orderData.discountAmount)}</p>` : ''}
    </div>
    ` : ''}
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">This order was placed on the B2C shop at shop.b8shield.com</p>
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
