const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', orderData, userData }) => {
  const orderNumber = orderData.orderNumber;
  const contactPerson = userData.contactPerson || userData.companyName || '';

  const templates = {
    'sv-SE': {
      subject: `Order levererad: ${orderNumber}`,
      text: `
Hej ${contactPerson},

Din order har levererats framgångsrikt!

Ordernummer: ${orderNumber}
Status: Levererad

Tack för att du handlar med B8Shield. Om du har några frågor eller problem med din order, tveka inte att kontakta oss.

Vi uppskattar ditt förtroende och ser fram emot att hjälpa dig igen.

Med vänliga hälsningar,
B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hej ${contactPerson},</h2>
  <p>Din order har levererats framgångsrikt!</p>
  <p><strong>Ordernummer:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Levererad</p>
  <p>Tack för att du handlar med B8Shield. Om du har några frågor eller problem med din order, tveka inte att kontakta oss.</p>
  <p>Vi uppskattar ditt förtroende och ser fram emot att hjälpa dig igen.</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>
`,
    },
    'en-GB': {
      subject: `Order delivered: ${orderNumber}`,
      text: `
Hello ${contactPerson},

Your order has been successfully delivered!

Order number: ${orderNumber}
Status: Delivered

Thank you for shopping with B8Shield. If you have any questions or issues with your order, please don't hesitate to contact us.

We appreciate your trust and look forward to serving you again.

Best regards,
The B8Shield Team
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
  </div>
  <h2>Hello ${contactPerson},</h2>
  <p>Your order has been successfully delivered!</p>
  <p><strong>Order number:</strong> ${orderNumber}</p>
  <p><strong>Status:</strong> Delivered</p>
  <p>Thank you for shopping with B8Shield. If you have any questions or issues with your order, please don't hesitate to contact us.</p>
  <p>We appreciate your trust and look forward to serving you again.</p>
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