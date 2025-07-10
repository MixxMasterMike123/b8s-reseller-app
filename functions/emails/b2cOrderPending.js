const APP_URLS = require('../config');

function segmentFromLang(lang) {
  if (lang.startsWith('en')) return lang === 'en-GB' ? 'gb' : 'us';
  return 'se';
}

// Helper function to get product name from multilingual object
function getProductName(item, lang) {
  if (typeof item.name === 'object') {
    return item.name[lang] || item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'Okänd produkt';
  }
  return item.name || 'Okänd produkt';
}

// Helper function to format price
function formatPrice(price) {
  return `${price.toFixed(0)} SEK`;
}

module.exports = ({ lang = 'sv-SE', orderData, customerInfo }) => {
  const { orderNumber, id, items = [], subtotal = 0, shipping = 0, vat = 0, total = 0, discountAmount = 0, affiliateCode } = orderData;
  const customerName = customerInfo.firstName + (customerInfo.lastName ? ' ' + customerInfo.lastName : '') || customerInfo.name || 'Kund';
  const segment = segmentFromLang(lang);
  const orderUrl = `${APP_URLS.B2C_SHOP}/${segment}/order-confirmation/${id || ''}`;

  const templates = {
    'sv-SE': {
      subject: `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
      text: `
Hej ${customerName},

Tack för din beställning från B8Shield! Vi har mottagit din order och kommer att behandla den snarast.

ORDERDETALJER:
Ordernummer: ${orderNumber}
Status: Mottagen

PRODUKTER:
${items.map(item => `- ${getProductName(item, lang)} x ${item.quantity} - ${formatPrice(item.price * item.quantity)}`).join('\n')}

ORDERSAMMANFATTNING:
Delsumma: ${formatPrice(subtotal)}
Frakt: ${formatPrice(shipping)}
${discountAmount > 0 ? `Rabatt: -${formatPrice(discountAmount)}\n` : ''}Moms (25%): ${formatPrice(vat)}
TOTALT: ${formatPrice(total)}

Du kommer att få ytterligare uppdateringar när din order behandlas och skickas.
Se din orderstatus här: ${orderUrl}

Med vänliga hälsningar,
B8Shield Team
JPH Innovation AB
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${customerName},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Tack för din beställning från B8Shield! Vi har mottagit din order och kommer att behandla den snarast.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">📋 ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Mottagen</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>E-post:</strong> ${customerInfo.email}</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">🛒 DINA PRODUKTER:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        ${items.map(item => `
          <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; flex: 1;">
              <img src="${item.b2cImageUrl || item.imageUrl || ''}" alt="${getProductName(item, lang)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e5e7eb;" onerror="this.style.display='none';" />
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #1f2937;">${getProductName(item, lang)}</div>
                <div style="font-size: 14px; color: #6b7280;">Kvantitet: ${item.quantity} st × ${formatPrice(item.price)}</div>
              </div>
            </div>
            <div style="font-weight: bold; color: #1f2937;">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">💰 ORDERSAMMANFATTNING:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #374151;">Delsumma:</span>
          <span style="color: #374151; font-weight: bold;">${formatPrice(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #374151;">Frakt:</span>
          <span style="color: #374151; font-weight: bold;">${formatPrice(shipping)}</span>
        </div>
        ${discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #059669;">Rabatt ${affiliateCode ? '(' + affiliateCode + ')' : ''}:</span>
          <span style="color: #059669; font-weight: bold;">-${formatPrice(discountAmount)}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #374151;">Moms (25%):</span>
          <span style="color: #374151; font-weight: bold;">${formatPrice(vat)}</span>
        </div>
        <hr style="border: none; border-top: 2px solid #f59e0b; margin: 15px 0;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #1f2937; font-size: 18px; font-weight: bold;">TOTALT:</span>
          <span style="color: #1f2937; font-size: 18px; font-weight: bold;">${formatPrice(total)}</span>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Följ din order</a>
    </div>

    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Du kommer att få ytterligare uppdateringar när din order behandlas och skickas.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>
`
    },
    'en-GB': {
      subject: `Thank you for your order, ${customerName}! (Order ${orderNumber})`,
      text: `
Hello ${customerName},

Thank you for shopping with B8Shield! We have received your order and will process it shortly.

ORDER DETAILS:
Order number: ${orderNumber}
Status: Received

PRODUCTS:
${items.map(item => `- ${getProductName(item, lang)} x ${item.quantity} - ${formatPrice(item.price * item.quantity)}`).join('\n')}

ORDER SUMMARY:
Subtotal: ${formatPrice(subtotal)}
Shipping: ${formatPrice(shipping)}
${discountAmount > 0 ? `Discount: -${formatPrice(discountAmount)}\n` : ''}VAT (25%): ${formatPrice(vat)}
TOTAL: ${formatPrice(total)}

You will receive further updates as your order progresses and is shipped out.
Check your order status here: ${orderUrl}

Best regards,
The B8Shield Team
JPH Innovation AB
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${customerName},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Thank you for shopping with B8Shield! We have received your order and will process it shortly.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">📋 ORDER DETAILS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order number:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Received</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${customerInfo.email}</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">🛒 YOUR PRODUCTS:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        ${items.map(item => `
          <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; flex: 1;">
              <img src="${item.b2cImageUrl || item.imageUrl || ''}" alt="${getProductName(item, lang)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e5e7eb;" onerror="this.style.display='none';" />
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #1f2937;">${getProductName(item, lang)}</div>
                <div style="font-size: 14px; color: #6b7280;">Quantity: ${item.quantity} pcs × ${formatPrice(item.price)}</div>
              </div>
            </div>
            <div style="font-weight: bold; color: #1f2937;">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">💰 ORDER SUMMARY:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #374151;">Subtotal:</span>
          <span style="color: #374151; font-weight: bold;">${formatPrice(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #374151;">Shipping:</span>
          <span style="color: #374151; font-weight: bold;">${formatPrice(shipping)}</span>
        </div>
        ${discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #059669;">Discount ${affiliateCode ? '(' + affiliateCode + ')' : ''}:</span>
          <span style="color: #059669; font-weight: bold;">-${formatPrice(discountAmount)}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #374151;">VAT (25%):</span>
          <span style="color: #374151; font-weight: bold;">${formatPrice(vat)}</span>
        </div>
        <hr style="border: none; border-top: 2px solid #f59e0b; margin: 15px 0;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #1f2937; font-size: 18px; font-weight: bold;">TOTAL:</span>
          <span style="color: #1f2937; font-size: 18px; font-weight: bold;">${formatPrice(total)}</span>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Track your order</a>
    </div>

    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">You will receive further updates as your order progresses and is shipped out.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>
`
    }
  };

  const resolvedLang = templates[lang] ? lang : (lang.startsWith('en') ? 'en-GB' : 'sv-SE');
  return templates[resolvedLang];
}; 