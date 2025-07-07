const APP_URLS = require('../config');

function segmentFromLang(lang) {
  if (lang.startsWith('en')) return lang === 'en-GB' ? 'gb' : 'us';
  return 'se';
}

module.exports = ({ lang = 'sv-SE', orderData, customerInfo }) => {
  const { orderNumber, id } = orderData;
  const customerName = customerInfo.name;
  const segment = segmentFromLang(lang);
  const orderUrl = `${APP_URLS.B2C_SHOP}/${segment}/order-confirmation/${id || ''}`;

  const templates = {
    'sv-SE': {
      subject: `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
      text: `
Hej ${customerName},

Tack för din beställning från B8Shield! Vi har mottagit din order och kommer att behandla den snarast.

Ordernummer: ${orderNumber}
Status: Mottagen

Du kommer att få ytterligare uppdateringar när din order behandlas och skickas. Du kan se din orderstatus här: ${orderUrl}

Med vänliga hälsningar,
B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
  <div style="text-align:center; margin-bottom:30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width:200px; height:auto;" />
  </div>
  <h2>Hej ${customerName},</h2>
  <p>Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
  <p><strong>Ordernummer:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Mottagen</p>
  <p>Du kan se din orderstatus här: <a href="${orderUrl}">${orderUrl}</a></p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>`
    },
    'en-GB': {
      subject: `Thank you for your order, ${customerName}! (Order ${orderNumber})`,
      text: `
Hello ${customerName},

Thank you for shopping with B8Shield! We have received your order and will process it shortly.

Order number: ${orderNumber}
Status: Received

You will receive further updates as your order progresses and is shipped out. You can check your order status here: ${orderUrl}

Best regards,
The B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
  <div style="text-align:center; margin-bottom:30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width:200px; height:auto;" />
  </div>
  <h2>Hello ${customerName},</h2>
  <p>Thank you for your order! We have received it and will process it shortly.</p>
  <p><strong>Order number:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Received</p>
  <p>You can check your order status here: <a href="${orderUrl}">${orderUrl}</a></p>
  <p>Best regards,<br>The B8Shield Team</p>
</div>`
    }
  };

  const resolvedLang = templates[lang] ? lang : (lang.startsWith('en') ? 'en-GB' : 'sv-SE');
  return templates[resolvedLang];
}; 