const APP_URLS = require('../config');

module.exports = ({ lang = 'sv-SE', customerData, temporaryPassword }) => {
  const companyName = customerData.companyName;
  const contactPerson = customerData.contactPerson;
  const email = customerData.email;

  const templates = {
    'sv-SE': {
      subject: `Välkommen till B8Shield Återförsäljarportalen - Dina inloggningsuppgifter`,
      text: `
Hej ${contactPerson},

Välkommen till B8Shield Återförsäljarportalen!

Vi har skapat ett konto för ${companyName} och du kan nu komma åt vår återförsäljarportal.

DINA INLOGGNINGSUPPGIFTER:

E-post: ${email}
Tillfälligt lösenord: ${temporaryPassword}

VIKTIG INFORMATION:
- Du måste ändra ditt lösenord vid första inloggningen
- Portalen finns på: ${APP_URLS.B2B_PORTAL}
- Ditt konto har aktiverats och du har nu tillgång till alla återförsäljarfunktioner

VAD KAN DU GÖRA I PORTALEN:
- Lägga beställningar direkt
- Se din orderhistorik
- Ladda ner produktkataloger
- Komma åt marknadsföringsmaterial

Om du har några frågor eller problem med inloggningen, tveka inte att kontakta oss.

Vi ser fram emot ett framgångsrikt samarbete!

Med vänliga hälsningar,
B8Shield Team
JPH Innovation AB
`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Välkommen till B8Shield Återförsäljarportalen!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Vi har skapat ett konto för <strong>${companyName}</strong> och du kan nu komma åt vår återförsäljarportal.</p>
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[INLOGGNING] DINA INLOGGNINGSUPPGIFTER:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>E-post:</strong> ${email}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Tillfälligt lösenord:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code></p>
    </div>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[VIKTIGT] VIKTIG INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>Du måste ändra ditt lösenord vid första inloggningen</li>
        <li>Portalen finns på: <a href="${APP_URLS.B2B_PORTAL}" style="color: #2563eb;">${APP_URLS.B2B_PORTAL}</a></li>
        <li>Ditt konto har aktiverats och du har nu tillgång till alla återförsäljarfunktioner</li>
      </ul>
    </div>
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[FUNKTIONER] VAD KAN DU GÖRA I PORTALEN:</h4>
      <ul style="color: #065f46; margin: 0; padding-left: 20px;">
        <li>Lägga beställningar direkt</li>
        <li>Se din orderhistorik</li>
        <li>Ladda ner produktkataloger</li>
        <li>Komma åt marknadsföringsmaterial</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URLS.B2B_PORTAL}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Logga in på portalen</a>
    </div>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Om du har några frågor eller problem med inloggningen, tveka inte att kontakta oss.</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Vi ser fram emot ett framgångsrikt samarbete!</p>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>
`,
    },
  };

  return templates[lang] || templates['sv-SE'];
}; 