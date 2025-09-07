const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', orderData, userData }) => {
  const orderNumber = orderData.orderNumber;
  const contactPerson = userData.contactPerson || userData.companyName || '';

  const templates = {
    'sv-SE': {
      subject: `Order mottagen: ${orderNumber}`,
      text: `
Hej ${contactPerson},

Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.

Ordernummer: ${orderNumber}
Status: Mottagen

Du kommer att få ytterligare uppdateringar när din order behandlas.

Med vänliga hälsningar,
B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hej ${contactPerson},</h2>
  <p>Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
  <p><strong>Ordernummer:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Mottagen</p>
  <p>Du kommer att få ytterligare uppdateringar när din order behandlas.</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>
`,
    },
    'en-GB': {
      subject: `Order received: ${orderNumber}`,
      text: `
Hello ${contactPerson},

Thank you for your purchase! We have received your order and will process it shortly.

Order number: ${orderNumber}
Status: Received

You will receive further updates as your order progresses.

Best regards,
The B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hello ${contactPerson},</h2>
  <p>Thank you for your purchase! We have received your order and will process it shortly.</p>
  <p><strong>Order number:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Received</p>
  <p>You will receive further updates as your order progresses.</p>
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