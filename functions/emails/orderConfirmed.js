const APP_URLS = require('../config');

// Helper function to get product name from multilingual object
function getProductName(item, lang) {
  if (typeof item.name === 'object') {
    return item.name[lang] || item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'Okänd produkt';
  }
  return item.name || 'Okänd produkt';
}

// Helper function to format price excluding VAT (B2B requires exact pricing for bookkeeping)
function formatPriceExclVAT(price) {
  return `${price.toFixed(2)} SEK`;
}

module.exports = ({ lang = 'sv-SE', orderData, userData, orderId }) => {
  const { orderNumber, items = [], subtotal = 0, totalAmount = 0 } = orderData;
  const contactPerson = userData.contactPerson || userData.companyName || '';
  const customerEmail = userData.email || '';
  const orderUrl = `${APP_URLS.B2B_PORTAL}/orders/${orderId || ''}`;
  
  // Calculate total from items if totalAmount is 0 or missing
  const calculatedTotal = totalAmount > 0 ? totalAmount : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const templates = {
    'sv-SE': {
      subject: `Order bekräftad: ${orderNumber}`,
      text: `
Hej ${contactPerson},

Din order har nu bekräftats och kommer att behandlas inom kort.

ORDERDETALJER:
Ordernummer: ${orderNumber}
Status: Bekräftad
Företag: ${userData.companyName || 'Ej angett'}

PRODUKTER:
${items.map(item => `- ${getProductName(item, lang)} x ${item.quantity} - ${formatPriceExclVAT(item.price * item.quantity)} (exkl. moms)`).join('\n')}

TOTALT: ${formatPriceExclVAT(calculatedTotal)} (exkl. moms)

Du kommer att få ytterligare uppdateringar när din order behandlas och skickas.
Följ din order här: ${orderUrl}

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
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Din order har nu bekräftats och kommer att behandlas inom kort.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">📋 ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Ordernummer:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Bekräftad</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Företag:</strong> ${userData.companyName || 'Ej angett'}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Kontaktperson:</strong> ${contactPerson}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>E-post:</strong> ${customerEmail}</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">🛒 BESTÄLLDA PRODUKTER:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        ${items.map(item => `
          <table style="width: 100%; border-bottom: 1px solid #e5e7eb; padding: 10px 0; margin-bottom: 8px;">
            <tr>
              <td style="width: 60px; vertical-align: top; padding-right: 12px;">
                ${item.image ? `<img src="${item.image}" alt="${getProductName(item, lang)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; display: block;" />` : ''}
              </td>
              <td style="vertical-align: top; padding-right: 12px;">
                <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">${getProductName(item, lang)}</div>
                <div style="font-size: 14px; color: #6b7280;">Kvantitet: ${item.quantity} st × ${formatPriceExclVAT(item.price)}</div>
              </td>
              <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                <div style="font-weight: bold; color: #1f2937; font-size: 16px;">${formatPriceExclVAT(item.price * item.quantity)}</div>
                <div style="font-size: 12px; color: #6b7280;">exkl. moms</div>
              </td>
            </tr>
          </table>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">💰 ORDERSAMMANFATTNING:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTALT (exkl. moms):</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPriceExclVAT(calculatedTotal)}</td>
          </tr>
          <tr>
            <td colspan="2" style="font-size: 12px; color: #6b7280; padding-top: 8px;">
              <em>Moms tillkommer enligt gällande momssats vid leverans</em>
            </td>
          </tr>
        </table>
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
`,
    },
    'en-GB': {
      subject: `Order confirmed: ${orderNumber}`,
      text: `
Hello ${contactPerson},

Your order has been confirmed and will be processed shortly.

ORDER DETAILS:
Order number: ${orderNumber}
Status: Confirmed
Company: ${userData.companyName || 'Not specified'}

PRODUCTS:
${items.map(item => `- ${getProductName(item, lang)} x ${item.quantity} - ${formatPriceExclVAT(item.price * item.quantity)} (excl. VAT)`).join('\n')}

TOTAL: ${formatPriceExclVAT(calculatedTotal)} (excl. VAT)

You will receive further updates as your order progresses and is shipped out.
Track your order here: ${orderUrl}

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
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Your order has been confirmed and will be processed shortly.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">📋 ORDER DETAILS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order number:</strong> ${orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Confirmed</span></p>
      <p style="margin: 8px 0; color: #374151;"><strong>Company:</strong> ${userData.companyName || 'Not specified'}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Contact person:</strong> ${contactPerson}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${customerEmail}</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">🛒 ORDERED PRODUCTS:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        ${items.map(item => `
          <table style="width: 100%; border-bottom: 1px solid #e5e7eb; padding: 10px 0; margin-bottom: 8px;">
            <tr>
              <td style="width: 60px; vertical-align: top; padding-right: 12px;">
                ${item.image ? `<img src="${item.image}" alt="${getProductName(item, lang)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; display: block;" />` : ''}
              </td>
              <td style="vertical-align: top; padding-right: 12px;">
                <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">${getProductName(item, lang)}</div>
                <div style="font-size: 14px; color: #6b7280;">Quantity: ${item.quantity} pcs × ${formatPriceExclVAT(item.price)}</div>
              </td>
              <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                <div style="font-weight: bold; color: #1f2937; font-size: 16px;">${formatPriceExclVAT(item.price * item.quantity)}</div>
                <div style="font-size: 12px; color: #6b7280;">excl. VAT</div>
              </td>
            </tr>
          </table>
        `).join('')}
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">💰 ORDER SUMMARY:</h4>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td colspan="2" style="border-top: 2px solid #f59e0b; padding: 15px 0 0 0;"></td>
          </tr>
          <tr>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; padding: 4px 0;">TOTAL (excl. VAT):</td>
            <td style="color: #1f2937; font-size: 18px; font-weight: bold; text-align: right; padding: 4px 0;">${formatPriceExclVAT(calculatedTotal)}</td>
          </tr>
          <tr>
            <td colspan="2" style="font-size: 12px; color: #6b7280; padding-top: 8px;">
              <em>VAT will be added according to applicable tax rate upon delivery</em>
            </td>
          </tr>
        </table>
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
`,
    },
    'en-US': null,
    'en': null,
  };

  const resolvedLang = templates[lang] && typeof templates[lang] === 'object' ? lang : (lang.startsWith('en') ? 'en-GB' : 'sv-SE');
  return templates[resolvedLang];
}; 