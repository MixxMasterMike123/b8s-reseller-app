const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', orderData, userData }) => {
  const orderNumber = orderData.orderNumber;
  const contactPerson = userData.contactPerson || userData.companyName || '';

  const templates = {
    'sv-SE': {
      subject: `Order i behandling: ${orderNumber}`,
      text: `
Hej ${contactPerson},

Din order är nu under behandling och förbereds för leverans.

Ordernummer: ${orderNumber}
Status: Behandlas

Vi kommer att meddela dig när ordern har skickats.

Med vänliga hälsningar,
B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hej ${contactPerson},</h2>
  <p>Din order är nu under behandling och förbereds för leverans.</p>
  <p><strong>Ordernummer:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Behandlas</p>
  <p>Vi kommer att meddela dig när ordern har skickats.</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>
`,
    },
    'en-GB': {
      subject: `Order processing: ${orderNumber}`,
      text: `
Hello ${contactPerson},

Your order is now being processed and prepared for shipment.

Order number: ${orderNumber}
Status: Processing

We will notify you once your order has been shipped.

Best regards,
The B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hello ${contactPerson},</h2>
  <p>Your order is now being processed and prepared for shipment.</p>
  <p><strong>Order number:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Processing</p>
  <p>We will notify you once your order has been shipped.</p>
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