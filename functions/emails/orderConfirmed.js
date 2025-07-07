const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', orderData, userData }) => {
  const orderNumber = orderData.orderNumber;
  const contactPerson = userData.contactPerson || userData.companyName || '';

  const templates = {
    'sv-SE': {
      subject: `Order bekräftad: ${orderNumber}`,
      text: `
Hej ${contactPerson},

Din order har nu bekräftats och kommer att behandlas inom kort.

Ordernummer: ${orderNumber}
Status: Bekräftad

Du kommer att få ytterligare uppdateringar när din order behandlas och skickas.

Med vänliga hälsningar,
B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hej ${contactPerson},</h2>
  <p>Din order har nu bekräftats och kommer att behandlas inom kort.</p>
  <p><strong>Ordernummer:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Bekräftad</p>
  <p>Du kommer att få ytterligare uppdateringar när din order behandlas och skickas.</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>
`,
    },
    'en-GB': {
      subject: `Order confirmed: ${orderNumber}`,
      text: `
Hello ${contactPerson},

Your order has been confirmed and will be processed shortly.

Order number: ${orderNumber}
Status: Confirmed

You will receive further updates as your order progresses and is shipped out.

Best regards,
The B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hello ${contactPerson},</h2>
  <p>Your order has been confirmed and will be processed shortly.</p>
  <p><strong>Order number:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Confirmed</p>
  <p>You will receive further updates as your order progresses and is shipped out.</p>
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