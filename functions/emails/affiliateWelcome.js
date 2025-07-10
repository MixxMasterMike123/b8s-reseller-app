const APP_URLS = require('../config');

function getSegment(lang) {
  if (lang.startsWith('en')) return lang === 'en-GB' ? 'gb' : 'us';
  return 'se';
}

module.exports = ({ lang = 'sv-SE', appData, affiliateCode, tempPassword, loginInstructions, wasExistingAuthUser }) => {
  const segment = getSegment(lang);
  const portalUrl = `${APP_URLS.B2C_SHOP}/${segment}/affiliate-portal`;
  const referralUrl = `${APP_URLS.B2C_SHOP}/${segment}/?ref=${affiliateCode}`;

  const templates = {
    'sv-SE': {
      subject: 'Välkommen till B8Shield Affiliate Program!',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2>Grattis, ${appData.name}!</h2>
  <p>Din ansökan till B8Shields affiliate-program har blivit godkänd.</p>
  <p>Här är dina inloggningsuppgifter för <a href="${portalUrl}">Affiliate-portalen</a>:</p>
  ${loginInstructions}
  <hr>
  <h3>Din unika affiliatelänk:</h3>
  <p>Använd denna länk för att tjäna provision på alla köp:</p>
  <p><strong><a href="${referralUrl}">${referralUrl}</a></strong></p>
  <br>
  <p>Lycka till med försäljningen!</p>
  <p>Med vänliga hälsningar,<br>B8Shield Team</p>
</div>`
    },
    'en-GB': {
      subject: 'Welcome to the B8Shield Affiliate Programme!',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2>Congratulations, ${appData.name}!</h2>
  <p>Your application to the B8Shield affiliate programme has been approved.</p>
  <p>Here are your login details for the <a href="${portalUrl}">Affiliate Portal</a>:</p>
  ${loginInstructions}
  <hr>
  <h3>Your unique affiliate link:</h3>
  <p>Use this link to earn commission on every purchase:</p>
  <p><strong><a href="${referralUrl}">${referralUrl}</a></strong></p>
  <br>
  <p>Good luck with your sales!</p>
  <p>Best regards,<br>The B8Shield Team</p>
</div>`
    },
    'en-US': {
      subject: 'Welcome to the B8Shield Affiliate Program!',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2>Congratulations, ${appData.name}!</h2>
  <p>Your application to the B8Shield affiliate program has been approved.</p>
  <p>Here are your login credentials for the <a href="${portalUrl}">Affiliate Portal</a>:</p>
  ${loginInstructions}
  <hr>
  <h3>Your unique affiliate link:</h3>
  <p>Use this link to earn commission on all purchases:</p>
  <p><strong><a href="${referralUrl}">${referralUrl}</a></strong></p>
  <br>
  <p>Good luck with your sales!</p>
  <p>Best regards,<br>The B8Shield Team</p>
</div>`
    }
  };

  const resolvedLang = templates[lang] ? lang : (lang.startsWith('en') ? (lang === 'en-GB' ? 'en-GB' : 'en-US') : 'sv-SE');
  return templates[resolvedLang];
}; 