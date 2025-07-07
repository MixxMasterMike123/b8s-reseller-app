const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', orderData, userData }) => {
  const orderNumber = orderData.orderNumber;
  const contactPerson = userData.contactPerson || userData.companyName || '';

  // Only Swedish for now, but structure allows expansion.
  const templates = {
    // Swedish (default)
    'sv-SE': {
      subject: `Order skickad: ${orderNumber}`,
      text: `
Hej ${contactPerson},

Goda nyheter! Din order har skickats och är nu på väg till dig.

Ordernummer: ${orderNumber}
Status: Skickad
${orderData.trackingNumber ? `Spårningsnummer: ${orderData.trackingNumber}` : ''}
${orderData.carrier ? `Transportör: ${orderData.carrier}` : ''}

Din order kommer att levereras inom 1-3 arbetsdagar.

Med vänliga hälsningar,
B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hej ${contactPerson},</h2>
  <p>Goda nyheter! Din order har skickats och är nu på väg till dig.</p>
  <p><strong>Ordernummer:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Skickad</p>
  ${orderData.trackingNumber ? `<p><strong>Spårningsnummer:</strong> ${orderData.trackingNumber}</p>` : ''}
  ${orderData.carrier ? `<p><strong>Transportör:</strong> ${orderData.carrier}</p>` : ''}
  <p>Din order kommer att levereras inom 1-3 arbetsdagar.</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>
`,
    },
    // English – identical for now for UK and US
    'en-GB': {
      subject: `Order shipped: ${orderNumber}`,
      text: `
Hello ${contactPerson},

Good news! Your order has been shipped and is on its way to you.

Order number: ${orderNumber}
Status: Shipped
${orderData.trackingNumber ? `Tracking number: ${orderData.trackingNumber}` : ''}
${orderData.carrier ? `Carrier: ${orderData.carrier}` : ''}

Your order will be delivered within 1-3 business days.

Best regards,
The B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hello ${contactPerson},</h2>
  <p>Good news! Your order has been shipped and is on its way to you.</p>
  <p><strong>Order number:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Shipped</p>
  ${orderData.trackingNumber ? `<p><strong>Tracking number:</strong> ${orderData.trackingNumber}</p>` : ''}
  ${orderData.carrier ? `<p><strong>Carrier:</strong> ${orderData.carrier}</p>` : ''}
  <p>Your order will be delivered within 1-3 business days.</p>
  <p>Best regards,<br>The B8Shield Team</p>
</div>
`,
    },
    // For en-US we reuse en-GB content now
    'en-US': null,
    'en': null,
  };

  // Fallback logic: if lang template is null or missing, map to en-GB, then sv-SE
  const resolvedLang = templates[lang] && typeof templates[lang] === 'object' ? lang : (lang.startsWith('en') ? 'en-GB' : 'sv-SE');

  return templates[resolvedLang];
}; 