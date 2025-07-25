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
      subject: 'Välkommen till B8Shield Affiliate Program! - Dina inloggningsuppgifter',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: #1f2937; margin-bottom: 20px;">Grattis, ${appData.name}!</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Din ansökan till B8Shields affiliate-program har blivit godkänd!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Du är nu en officiell B8Shield-affiliate och kan börja tjäna provision på alla försäljningar.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[INLOGGNING] DINA INLOGGNINGSUPPGIFTER:</h3>
      ${loginInstructions}
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[VIKTIGT] VIKTIG INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>Du måste ändra ditt lösenord vid första inloggningen</li>
        <li>Affiliate-portalen finns på: <a href="${portalUrl}" style="color: #2563eb;">${portalUrl}</a></li>
        <li>Ditt konto har aktiverats och du har nu tillgång till alla affiliate-funktioner</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[AFFILIATE] DIN UNIKA AFFILIATE-LÄNK:</h4>
      <p style="color: #065f46; margin-bottom: 15px;">Använd denna länk för att tjäna provision på alla köp:</p>
      <div style="background-color: #d1fae5; padding: 12px; border-radius: 4px; border-left: 4px solid #10b981;">
        <a href="${referralUrl}" style="color: #065f46; text-decoration: none; font-weight: bold; word-break: break-all;">${referralUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[FUNKTIONER] VAD KAN DU GÖRA I AFFILIATE-PORTALEN:</h4>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
        <li>Se dina försäljningsstatistik och intäkter</li>
        <li>Spåra klick och konverteringar</li>
        <li>Ladda ner marknadsföringsmaterial</li>
        <li>Hantera dina utbetalningar</li>
        <li>Få support och hjälp</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Logga in på affiliate-portalen</a>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Om du har några frågor eller behöver hjälp, tveka inte att kontakta oss.</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Vi ser fram emot ett framgångsrikt samarbete!</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-GB': {
      subject: 'Welcome to the B8Shield Affiliate Programme! - Your Login Credentials',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: #1f2937; margin-bottom: 20px;">Congratulations, ${appData.name}!</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Your application to the B8Shield affiliate programme has been approved!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">You are now an official B8Shield affiliate and can start earning commission on all sales.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[LOGIN] YOUR LOGIN CREDENTIALS:</h3>
      ${loginInstructions}
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[IMPORTANT] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>You must change your password on first login</li>
        <li>The Affiliate Portal is available at: <a href="${portalUrl}" style="color: #2563eb;">${portalUrl}</a></li>
        <li>Your account has been activated and you now have access to all affiliate functions</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[AFFILIATE] YOUR UNIQUE AFFILIATE LINK:</h4>
      <p style="color: #065f46; margin-bottom: 15px;">Use this link to earn commission on every purchase:</p>
      <div style="background-color: #d1fae5; padding: 12px; border-radius: 4px; border-left: 4px solid #10b981;">
        <a href="${referralUrl}" style="color: #065f46; text-decoration: none; font-weight: bold; word-break: break-all;">${referralUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[FUNCTIONS] WHAT YOU CAN DO IN THE AFFILIATE PORTAL:</h4>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
        <li>View your sales statistics and earnings</li>
        <li>Track clicks and conversions</li>
        <li>Download marketing materials</li>
        <li>Manage your payouts</li>
        <li>Get support and help</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Affiliate Portal</a>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">If you have any questions or need assistance, please don't hesitate to contact us.</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">We look forward to a successful partnership!</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-US': {
      subject: 'Welcome to the B8Shield Affiliate Program! - Your Login Credentials',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    <h2 style="color: #1f2937; margin-bottom: 20px;">Congratulations, ${appData.name}!</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Your application to the B8Shield affiliate program has been approved!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">You are now an official B8Shield affiliate and can start earning commission on all sales.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[LOGIN] YOUR LOGIN CREDENTIALS:</h3>
      ${loginInstructions}
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[IMPORTANT] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>You must change your password on first login</li>
        <li>The Affiliate Portal is available at: <a href="${portalUrl}" style="color: #2563eb;">${portalUrl}</a></li>
        <li>Your account has been activated and you now have access to all affiliate functions</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[AFFILIATE] YOUR UNIQUE AFFILIATE LINK:</h4>
      <p style="color: #065f46; margin-bottom: 15px;">Use this link to earn commission on all purchases:</p>
      <div style="background-color: #d1fae5; padding: 12px; border-radius: 4px; border-left: 4px solid #10b981;">
        <a href="${referralUrl}" style="color: #065f46; text-decoration: none; font-weight: bold; word-break: break-all;">${referralUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[FUNCTIONS] WHAT YOU CAN DO IN THE AFFILIATE PORTAL:</h4>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
        <li>View your sales statistics and earnings</li>
        <li>Track clicks and conversions</li>
        <li>Download marketing materials</li>
        <li>Manage your payouts</li>
        <li>Get support and help</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Affiliate Portal</a>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">If you have any questions or need assistance, please don't hesitate to contact us.</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">We look forward to a successful partnership!</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    }
  };

  const resolvedLang = templates[lang] ? lang : (lang.startsWith('en') ? (lang === 'en-GB' ? 'en-GB' : 'en-US') : 'sv-SE');
  return templates[resolvedLang];
}; 