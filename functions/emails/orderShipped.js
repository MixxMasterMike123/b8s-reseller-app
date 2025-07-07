const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', orderData, userData }) => {
  const orderNumber = orderData.orderNumber;
  const contactPerson = userData.contactPerson || userData.companyName || '';

  // Only Swedish for now, but structure allows expansion.
  const templates = {
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
  };

  return templates[lang] || templates['sv-SE'];
}; 