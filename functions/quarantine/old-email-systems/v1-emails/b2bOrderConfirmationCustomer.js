const APP_URLS = require('../config');

module.exports = ({ userData, orderData, orderSummary, totalAmount }) => {
  const subject = `Orderbekräftelse: ${orderData.orderNumber}`;
  const text = `
Hej ${userData.contactPerson || userData.companyName},

Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.

Ordernummer: ${orderData.orderNumber}
Företag: ${userData.companyName}

Orderdetaljer:
${orderSummary}

Totalt: ${totalAmount} SEK

Du kommer att få ytterligare uppdateringar när din order behandlas.

Med vänliga hälsningar,
B8Shield Team
`;
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;" />
  </div>
  <h2>Orderbekräftelse</h2>
  <p>Hej ${userData.contactPerson || userData.companyName},</p>
  <p>Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
  <h3>Orderdetaljer:</h3>
  <p><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
  <p><strong>Företag:</strong> ${userData.companyName}</p>
  <h3>Beställning:</h3>
  <p>${orderSummary.replace(/\n/g, '<br>')}</p>
  <p><strong>Totalt: ${totalAmount} SEK</strong></p>
  <p>Du kommer att få ytterligare uppdateringar när din order behandlas.</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>`;
  return { subject, text, html };
}; 