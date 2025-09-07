const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', orderData, userData }) => {
  const orderNumber = orderData.orderNumber;
  const contactPerson = userData.contactPerson || userData.companyName || '';

  const templates = {
    'sv-SE': {
      subject: `Order avbruten: ${orderNumber}`,
      text: `
Hej ${contactPerson},

Din order har tyvärr avbrutits.

Ordernummer: ${orderNumber}
Status: Avbruten
${orderData.cancellationReason ? `Anledning: ${orderData.cancellationReason}` : ''}

Om du har några frågor om denna avbokning, vänligen kontakta vår kundtjänst.

Med vänliga hälsningar,
B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hej ${contactPerson},</h2>
  <p>Din order har tyvärr avbrutits.</p>
  <p><strong>Ordernummer:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Avbruten</p>
  ${orderData.cancellationReason ? `<p><strong>Anledning:</strong> ${orderData.cancellationReason}</p>` : ''}
  <p>Om du har några frågor om denna avbokning, vänligen kontakta vår kundtjänst.</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>
`,
    },
    'en-GB': {
      subject: `Order cancelled: ${orderNumber}`,
      text: `
Hello ${contactPerson},

Unfortunately, your order has been cancelled.

Order number: ${orderNumber}
Status: Cancelled
${orderData.cancellationReason ? `Reason: ${orderData.cancellationReason}` : ''}

If you have any questions about this cancellation, please contact our customer support.

Best regards,
The B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hello ${contactPerson},</h2>
  <p>Unfortunately, your order has been cancelled.</p>
  <p><strong>Order number:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Cancelled</p>
  ${orderData.cancellationReason ? `<p><strong>Reason:</strong> ${orderData.cancellationReason}</p>` : ''}
  <p>If you have any questions about this cancellation, please contact our customer support.</p>
  <p>Best regards,<br>The B8Shield Team</p>
</div>
`,
    },
    'en-US': null,
    'en': null,
  };

  const resolvedLang = templates[lang] && typeof templates[lang] === 'object' ? lang : (lang.startsWith('en') ? 'en-GB' : 'sv-SE');
  return templates[resolvedLang];
}; 