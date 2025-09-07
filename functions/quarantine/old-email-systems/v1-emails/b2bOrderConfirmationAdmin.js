const APP_URLS = require('../config');

module.exports = ({ userData, orderData, orderSummary, totalAmount }) => {
  const subject = `Ny order: ${orderData.orderNumber}`;
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;" />
  </div>
  <h2>Ny order mottagen</h2>
  <p><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
  <h3>Kundinformation:</h3>
  <p><strong>Företag:</strong> ${userData.companyName}</p>
  <p><strong>E-post:</strong> ${userData.email}</p>
  <p><strong>Kontaktperson:</strong> ${userData.contactPerson}</p>
  <h3>Orderdetaljer:</h3>
  <p>${orderSummary.replace(/\n/g, '<br>')}</p>
  <p><strong>Totalt: ${totalAmount} SEK</strong></p>
</div>`;
  const text = `
En ny order har skapats:

Ordernummer: ${orderData.orderNumber}
Kund: ${userData.companyName} (${userData.email})
Kontaktperson: ${userData.contactPerson}

Orderdetaljer:
${orderSummary}

Totalt: ${totalAmount} SEK
`;
  return { subject, text, html };
}; 